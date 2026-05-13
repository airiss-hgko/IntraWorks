# IntraWorks — Phase B+ 상세 구현 플랜

> **작성일**: 2026-04-28
> **전제**: Phase A MVP 운영 중 (장비 25대 / 배포 17건 / SiteCategory 탭 적용 완료)
> **목표**: 엑셀 대체를 넘어 SW팀 자체 운영 가치까지 끌어올리는 다음 단계
> **범위 원칙**: 하드웨어 운영 영역 제외, SW팀 내부 효율에 직결되는 것만

---

## 0. 우선순위 요약

| 순위 | 항목 | 신규/기존 | 작업량 | 가치 |
|------|------|----------|--------|------|
| **1** | 릴리스 레지스트리 (`tb_release`) | 신규 | M | ★★★ |
| **2** | 유지보수 이력 UI (`MaintenanceLog`) | 스키마만 있음 | S | ★★★ |
| **3** | 장비이전 이력 (`tb_device_transfer`) | 신규 | S | ★★ |
| **4** | Config 자동 diff & 변경 감지 알림 | 비교UI 있음 | S | ★★ |
| **5** | 장비별 이슈 트래커 (`tb_issue`) | 신규 | M | ★★ |
| **6** | 캘리브레이션·소스카운트 알림 (대시보드) | 필드 있음 | XS | ★★ |
| **7** | 감사 로그 화면 (`AuditLog`) | 스키마만 있음 | S | ★ |

> 1~4를 **Phase B1**, 5~7을 **Phase B2**로 분리해서 진행.

---

## 1. 릴리스 레지스트리 (P1)

### 1.1 문제

현재 `DeployHistory.swVersion`은 단순 문자열(`"2.0.0.0"`). "이 버전이 정확히 어떤 빌드인지", "변경사항이 뭔지", "산출물 파일은 어디에 있는지"가 추적 불가. 1년 후 "이 장비 SW 2.0.0.0이 정확히 뭐였지?"에 답할 수 없음.

### 1.2 데이터 모델

```prisma
model Release {
  id            Int       @id @default(autoincrement())
  component     String    @db.VarChar(20)   // "SW" | "AI" | "PLC"
  version       String    @db.VarChar(50)   // "2.0.0.0"
  modelName     String?   @map("model_name") @db.VarChar(100) // 특정 모델 전용 빌드면 지정 (null=공통)

  buildDate     DateTime? @map("build_date")
  builder       String?   @db.VarChar(100)
  artifactName  String?   @map("artifact_name") @db.VarChar(255) // "AIXAC.RX.SW.DA-2.0.0.0.zip"
  artifactSha256 String?  @map("artifact_sha256") @db.VarChar(64)
  artifactPath  String?   @map("artifact_path") @db.VarChar(500) // 사내서버 경로 또는 URL

  changelog     String?   // 마크다운, 한글 변경요약
  releaseType   String?   @map("release_type") @db.VarChar(20)  // "정식" | "베타" | "긴급패치"
  isDeprecated  Boolean   @default(false) @map("is_deprecated")

  createdAt     DateTime  @default(now()) @map("created_at")

  deployHistory DeployHistory[]

  @@unique([component, version, modelName])
  @@map("tb_release")
}

// DeployHistory에 FK 추가 (기존 문자열 필드는 유지 — 마이그레이션 호환)
model DeployHistory {
  // ... 기존 필드 ...
  swReleaseId   Int?  @map("sw_release_id")
  aiReleaseId   Int?  @map("ai_release_id")
  plcReleaseId  Int?  @map("plc_release_id")

  swRelease     Release? @relation("SwRelease", fields: [swReleaseId], references: [id])
  aiRelease     Release? @relation("AiRelease", fields: [aiReleaseId], references: [id])
  plcRelease    Release? @relation("PlcRelease", fields: [plcReleaseId], references: [id])
}
```

### 1.3 화면

- **`/releases`** — 릴리스 목록 (탭: SW/AI/PLC, 필터: 모델·릴리스타입)
- **`/releases/new`** — 신규 릴리스 등록 (체크섬은 파일 업로드 시 자동 계산)
- **`/releases/[id]`** — 릴리스 상세 + 변경요약(마크다운) + 이 릴리스로 배포된 장비 목록
- **`/deploys/new`** 수정 — 버전 입력 시 자동완성으로 등록된 릴리스 선택, 미등록 버전이면 즉시 등록 가능
- **장비 상세** — 현재 버전 옆에 릴리스 노트 링크 표시

### 1.4 마이그레이션

- 기존 17건 배포 이력의 `swVersion` 등을 추출해 `tb_release` 자동 생성 (스크립트 `scripts/backfill-releases.ts`)
- `changelog`는 비워두고, 추후 수동 작성

---

## 2. 유지보수 이력 UI (P1)

### 2.1 문제

`MaintenanceLog` 테이블은 이미 schema.prisma에 있음. 그러나 API/페이지 없음 → 사용 불가.

### 2.2 데이터 모델 (이미 있음, 일부 보강)

```prisma
model MaintenanceLog {
  // 기존 필드 유지
  // 신규 추가:
  cost          Int?      // 부품비/외주비 (원 단위)
  attachments   String?   // JSON 배열, 사진/리포트 파일 경로
  status        String    @default("완료") @db.VarChar(20) // "예정" | "진행중" | "완료" | "취소"
}
```

> `next_due_date`는 이미 있음 → 알림 기능에서 활용.

### 2.3 화면

- **장비 상세 페이지에 "유지보수" 탭 추가**
  - 해당 장비의 MaintenanceLog 타임라인
  - "+ 유지보수 등록" 버튼
- **`/maintenance`** — 전체 유지보수 이력 페이지
  - 필터: 종류(캘리브레이션/소스교체/검출기교체/SW업데이트/점검), 기간, 수행자
  - 정렬: 수행일/예정일
  - "예정" 상태는 상단 고정
- **유지보수 등록 폼**
  - 장비 선택, 종류 드롭다운, 수행일, 수행자, 내용, 다음 예정일, 비용(선택), 첨부(선택)

### 2.4 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/maintenance` | 목록 (필터/정렬 지원) |
| POST | `/api/maintenance` | 등록 |
| GET | `/api/maintenance/[id]` | 상세 |
| PATCH | `/api/maintenance/[id]` | 수정 |
| DELETE | `/api/maintenance/[id]` | 삭제 |
| GET | `/api/devices/[id]/maintenance` | 특정 장비 이력 |

---

## 3. 장비이전 이력 (P2)

### 3.1 문제

DeployHistory에 `installLocation`이 추가되었지만 **배포 시점에만** 기록됨. 배포 없이 장비만 이전되는 경우(예: 우정국 광화문 → 제주, A고객 → B고객 재판매, 보관 → 판매)가 추적 안 됨. 또한 "이 장비가 거쳐온 모든 위치"의 통합 타임라인이 없음.

### 3.2 데이터 모델

```prisma
model DeviceTransfer {
  id              Int       @id @default(autoincrement())
  deviceId        Int       @map("device_id")
  device          Device    @relation(fields: [deviceId], references: [id])

  fromCustomer    String?   @map("from_customer") @db.VarChar(200)
  fromLocation    String?   @map("from_location") @db.VarChar(200)
  toCustomer      String?   @map("to_customer") @db.VarChar(200)
  toLocation      String?   @map("to_location") @db.VarChar(200)

  transferDate    DateTime  @map("transfer_date")
  transferType    String    @map("transfer_type") @db.VarChar(30) // "신규설치" | "이전설치" | "재판매" | "회수보관" | "폐기"
  reason          String?   // 사유
  performedBy     String?   @map("performed_by") @db.VarChar(100)

  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("tb_device_transfer")
}
```

### 3.3 동작

- 장비이전 등록 시 `Device.customerName` / `installLocation` 자동 갱신
- 장비 상세에 "이전 이력" 섹션 — 위치 변경 타임라인
- 배포 이력과 별도지만 시각적으로는 같은 타임라인에 통합 표시 (배포는 ⚙ 아이콘, 이전은 📦 아이콘)

### 3.4 화면

- 장비 상세에 "이전 이력" 섹션
- "+ 이전 등록" 모달 (간단 입력)
- 별도 페이지는 만들지 않음 (장비별 조회만 충분)

---

## 4. Config 자동 diff & 변경 감지 알림 (P2)

### 4.1 문제

Config 비교 UI는 있지만 **수동 비교**임. 의도치 않은 설정 변경(특히 AI 모델 토글, 이미지 처리 플래그)을 자동으로 감지하지 않음.

### 4.2 동작

- ConfigSnapshot 업로드 시 동일 장비의 직전 스냅샷과 자동 diff
- 변경된 키 개수 + 변경 항목 요약을 `ConfigSnapshot`에 캐시
- **위험 키** 화이트리스트(예: `AI.Model.*.IsUsing`, `ImageProcessing.IsHiddenSave`, `Device.DeviceId`)에 변경이 있으면 대시보드 알림에 표시

### 4.3 스키마 추가

```prisma
model ConfigSnapshot {
  // 기존 필드 +
  diffSummary   Json?    @map("diff_summary")    // {added: [...], removed: [...], changed: [{key, before, after}]}
  hasRiskyChange Boolean @default(false) @map("has_risky_change")
}
```

위험 키 정의는 코드(`src/lib/config-risk-rules.ts`)에 두고 운영 중 추가/수정.

### 4.4 화면

- 대시보드 ⚠ 알림 영역에 "최근 7일 위험 Config 변경" 섹션
- ConfigSnapshot 목록에서 변경 키 개수 컬럼 표시
- ConfigSnapshot 상세에서 diff 자동 펼쳐 보여주기

---

## 5. 장비별 이슈 트래커 (P3)

### 5.1 문제

현장 증상 → 워크어라운드 → 수정 버전의 연결이 어디에도 기록되지 않음. 사내 Jira는 SW팀 18대 규모에 과잉. **장비 ↔ 이슈 ↔ 수정 릴리스** 가벼운 연결이 필요.

### 5.2 데이터 모델

```prisma
model Issue {
  id              Int       @id @default(autoincrement())
  title           String    @db.VarChar(200)
  description     String?
  severity        String    @db.VarChar(20)   // "낮음" | "보통" | "높음" | "긴급"
  status          String    @default("open") @db.VarChar(20) // "open" | "workaround" | "fixed" | "wontfix"

  reportedBy      String?   @map("reported_by") @db.VarChar(100)
  reportedAt      DateTime  @default(now()) @map("reported_at")

  workaround      String?   // 임시 해결책

  fixedInReleaseId Int?     @map("fixed_in_release_id")
  fixedInRelease  Release?  @relation(fields: [fixedInReleaseId], references: [id])

  affectedDevices DeviceIssue[]

  @@map("tb_issue")
}

model DeviceIssue {
  deviceId  Int      @map("device_id")
  issueId   Int      @map("issue_id")
  device    Device   @relation(fields: [deviceId], references: [id])
  issue     Issue    @relation(fields: [issueId], references: [id])
  observedAt DateTime @default(now()) @map("observed_at")

  @@id([deviceId, issueId])
  @@map("tb_device_issue")
}
```

### 5.3 화면

- **`/issues`** — 이슈 목록 (필터: 상태/심각도/영향 모델)
- **`/issues/[id]`** — 이슈 상세 + 영향 장비 목록 + 수정 릴리스 링크
- **장비 상세** — "관련 이슈" 섹션 (open 이슈는 빨강, fixed는 회색)

---

## 6. 캘리브레이션·소스카운트 알림 (P3, 작업량 XS)

### 6.1 동작

- `Device.nextCalibrationDue` ≤ today + 14일 → 대시보드 ⚠ 알림
- `Device.sourceOnCount` ≥ 임계값(설정 가능, 기본 10000) → 대시보드 ⚠ 알림
- MaintenanceLog 등록 시 `next_due_date`로 자동 갱신

### 6.2 화면

- 대시보드 ⚠ 알림 영역에 캘리브레이션 임박 / 소스카운트 초과 장비 표시
- 장비 상세 헤더에 임박 시 배지 표시

> 별도 페이지 불필요. 기존 대시보드 알림 영역 채우는 작업.

---

## 7. 감사 로그 화면 (P3)

### 7.1 문제

`AuditLog` 모델은 있지만 (a) 어디서도 기록 안 됨, (b) 조회 화면 없음.

### 7.2 작업

- API Route 미들웨어에서 CRUD 시 자동 기록 (`src/lib/audit.ts`)
- **`/audit`** — 감사 로그 페이지 (필터: 사용자/액션/테이블/기간)
- 장비 상세에 "변경 이력" 탭 추가 (해당 장비 관련 AuditLog만)

---

## 8. 작업 순서 및 일정 (제안)

| 주차 | 작업 |
|------|------|
| **W1** | 1. 릴리스 레지스트리 (스키마 + 백필 + 목록/상세) |
| **W2** | 1. 릴리스 레지스트리 (배포 폼 통합) + 6. 알림 |
| **W3** | 2. 유지보수 이력 UI (장비탭 + 전체페이지 + 등록폼) |
| **W4** | 3. 장비이전 이력 + 4. Config 자동 diff |
| **W5+** | 5. 이슈 트래커 + 7. 감사 로그 |

> 각 주차 끝에 production 배포(현재 운영 중이므로). 마이그레이션은 모두 비파괴(추가만, 기존 컬럼 유지).

---

## 9. 명시적 비범위 (Non-goals)

다음은 이번 Phase에서 **하지 않음**:
- 원격 SW 배포 (보안검색 장비 인증 갱신 이슈)
- 장비 heartbeat / 실시간 모니터링 (네트워크 정책 의존)
- 이메일/슬랙 알림 (대시보드 표시로 우선 충분)
- 주간 보고 / 사내 문서 관리 (별도 Phase C)
- 모바일 앱 (반응형 웹으로 대응)
- 고객 마스터 분리 (SiteCategory로 80% 커버됨, 연락처 관리 필요해질 때 재검토)
- 라이선스 / 계약 관리 (SW팀 책임 범위 외)

---

## 10. 결정 필요 사항 (사용자 확인 요청)

다음은 진행 전 사용자 결정이 필요합니다:

1. **릴리스 산출물 저장 위치**: 사내 파일서버 경로 입력만 받을지, 실제 파일을 업로드 받을지?
2. **유지보수 첨부파일**: 사진/리포트를 어디에 저장? (DB BLOB / 사내서버 경로 / S3 호환)
3. **위험 Config 키 목록**: 4번의 위험 키 화이트리스트 초안을 같이 작성할지?
4. **W1부터 바로 시작 vs 우선순위 재조정**: 1번(릴리스 레지스트리)부터 시작 OK?
