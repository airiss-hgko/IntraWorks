# IntraWorks — 배포 번들 (Deployment Bundle) 플랜

> **작성일**: 2026-04-30
> **전제**: Phase B1 완료 (릴리스/유지보수 운영 중)
> **대상**: 실제 납품 시 캡처되는 폴더 묶음(Config + DM + 인텐시티 + 로그)을 중앙에서 추적

---

## 1. 현장 폴더 구조 분석 (D:\10. 배포)

```
D:\10. 배포\
├── 6040DA\
│   ├── 설치파일\                                    # 모델 공통 설치 산출물
│   │   ├── AIXAC.D.v2.0.0.0_Setup.msi
│   │   ├── AIXAC_RX_6040DA_v1.0.3.1_Setup.msi
│   │   └── AIXAC_RX_6040DA_v1.0.3.3_Setup.msi
│   ├── 6040DA004\
│   │   └── 20260511\                                # 배포 일자별 스냅샷
│   │       ├── Config\
│   │       │   ├── Config.local.json     (6 KB)    # 장비 로컬 설정
│   │       │   ├── SystemConfig.json     (200 B)   # 카운터·캘리브레이션 일자
│   │       │   └── StatusReport_…json     (7 KB)    # 종합 상태
│   │       └── DM Setting\
│   │           └── 20260511_132919_vertical.png …  # DM 이미지 여러 장
│   ├── 6040DA005\20260511\Config\…  (동일 구조)
│   └── 6040DA006\20260511\Config\…
├── 100100DA\
│   └── 100100DA003\
│       └── 20260511\
│           ├── Config\          (Config.local + SystemConfig + StatusReport)
│           ├── DM Setting\
│           │   ├── Config.DM.json                  # ★ 인텐시티 값 (detector × module × High/Low)
│           │   └── DM.png                          # 단일 합성 이미지
│           └── Logs\2026-04-15 … 2026-05-11        # 일자별 로그
├── 6040SA\        (현재 비어 있음)
└── 7555SA\        (현재 비어 있음)
```

### 1.1 핵심 관찰

| 관찰 | 의미 |
|------|------|
| **2계층 폴더**: `{모델}/{장비ID}/{YYYYMMDD}` | 한 번의 납품 = 한 폴더 = 한 "번들" |
| 같은 날짜(20260511)에 여러 장비 캡처 | 일괄 납품/캡처 작업이 일반적 |
| **설치파일**은 모델 단위 공통 보관 | 우리 W1 릴리스 `artifactPath` 후보 |
| `SystemConfig.json` = 누적 카운터 | 시간 흐름에 따라 변하는 값 — 시점별로 보존해야 추세 분석 가능 |
| `Config.DM.json` = 인텐시티 캘리브레이션 결과 | 모델별·검출기·모듈별 High/Low 값 |
| `Logs/` 일자별 폴더 | 100100DA만 존재 — 모델/배포 시기에 따라 옵션적 |
| DM 이미지 `*_vertical.png` 여러 장 | 캘리브레이션 검증용. 이미지 단위 의미 있음 |

### 1.2 현재 IntraWorks와의 갭

지금 `ConfigSnapshot` 테이블은 **JSON 1개만** 저장합니다. 실제 현장 산출물은:
- JSON 3종 (Config.local, SystemConfig, StatusReport)
- 이미지 다수 (DM 이미지)
- 인텐시티 매트릭스 1종 (Config.DM.json)
- 일자별 로그 폴더 (선택)

→ 이걸 **하나의 묶음(번들)**으로 다루는 새 개념이 필요합니다.

---

## 2. 핵심 개념 — DeploymentBundle

> **"한 번의 납품 시 캡처된 모든 산출물의 묶음"**

각 장비의 **배포 이력 한 건**은 이상적으로 **번들 한 개**와 매칭됩니다.

```
DeployHistory (배포 행위)        ──┐
"6040DA004에 SW 1.0.3.3 설치"      │  매칭
                                   ├─→  DeploymentBundle (산출물 묶음)
Release (빌드 카탈로그)            │  "20260511 캡처된 6040DA004 폴더 전체"
"SW 1.0.3.3 = 이런 빌드"          ──┘
```

이 셋을 합치면:
- **무엇을** (Release)
- **어디에 / 언제** (DeployHistory)
- **결과 상태** (DeploymentBundle ← Config + DM + 인텐시티)

---

## 3. 데이터 모델

### 3.1 신규 테이블

```prisma
model DeploymentBundle {
  id              Int       @id @default(autoincrement())
  deviceId        Int       @map("device_id")
  device          Device    @relation(fields: [deviceId], references: [id])

  // 배포 이력과 연결 (선택 — 배포 행위 없이 백업만 한 번들도 있을 수 있음)
  deployId        Int?      @unique @map("deploy_id")
  deploy          DeployHistory? @relation(fields: [deployId], references: [id])

  // 폴더 식별
  bundleDate      DateTime  @map("bundle_date")                // 20260511 → 2026-05-11
  basePath        String    @map("base_path") @db.VarChar(500) // \\server\10.배포\6040DA\6040DA004\20260511
  source          String    @default("manual_scan") @db.VarChar(30) // "manual_scan" | "upload" | "auto_sync"

  // SystemConfig.json 에서 추출한 카운터 (시점 스냅샷)
  imageCount          Int?       @map("image_count")
  totalSystemTime     String?    @map("total_system_time") @db.VarChar(20)   // "36:58:03"
  totalSourceTime     String?    @map("total_source_time") @db.VarChar(20)   // "00:50:56"
  sourceOnCount       Int?       @map("source_on_count")
  lastCalibrationDate DateTime?  @map("last_calibration_date")

  // Config.DM.json 에서 추출한 인텐시티 요약
  intensityDetectors  Int?       @map("intensity_detectors")    // 검출기 개수
  intensityModules    Int?       @map("intensity_modules")      // 모듈 개수 (per detector)
  intensityAvgHigh    Float?     @map("intensity_avg_high")
  intensityAvgLow     Float?     @map("intensity_avg_low")
  intensityMinHigh    Int?       @map("intensity_min_high")
  intensityMaxHigh    Int?       @map("intensity_max_high")
  intensityMinLow     Int?       @map("intensity_min_low")
  intensityMaxLow     Int?       @map("intensity_max_low")

  // 메타
  notes           String?
  uploadedBy      String?   @map("uploaded_by") @db.VarChar(100)
  uploadedAt      DateTime  @default(now()) @map("uploaded_at")

  files           DeploymentBundleFile[]

  @@unique([deviceId, bundleDate])     // 같은 날짜 같은 장비는 1번들
  @@index([deviceId, bundleDate])
  @@map("tb_deployment_bundle")
}

model DeploymentBundleFile {
  id            Int       @id @default(autoincrement())
  bundleId      Int       @map("bundle_id")
  bundle        DeploymentBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)

  category      String    @db.VarChar(20)     // "Config" | "DM"
  fileName      String    @map("file_name") @db.VarChar(255)
  relativePath  String    @map("relative_path") @db.VarChar(500)   // "Config/Config.local.json"
  fileSize      Int?      @map("file_size")
  fileHash      String?   @map("file_hash") @db.VarChar(64)        // SHA256
  contentType   String?   @map("content_type") @db.VarChar(100)

  // 모든 파일을 DB에 저장
  contentJson   Json?     @map("content_json")     // JSON 파일 (파싱된)
  contentBinary Bytes?    @map("content_binary")   // 이미지·바이너리

  capturedAt    DateTime? @map("captured_at")
  uploadedAt    DateTime  @default(now()) @map("uploaded_at")

  @@index([bundleId, category])
  @@map("tb_deployment_bundle_file")
}
```

### 3.2 기존 ConfigSnapshot 와의 관계

`ConfigSnapshot`은 그대로 둠 (호환). 새 번들을 받으면 **자동으로 ConfigSnapshot 1건도 같이 생성**해서 기존 비교 UI에서도 보이게 한다. 시간이 지나 번들이 충분히 쌓이면 ConfigSnapshot은 deprecate 가능.

---

## 4. 파일 저장 전략 (확정)

### 4.1 모두 DB에 저장

| 파일 종류 | 저장 위치 | 컬럼 |
|----------|----------|------|
| `Config.local.json` (6 KB) | DB | `contentJson` |
| `SystemConfig.json` (200 B) | DB | `contentJson` + 카운터 추출 |
| `StatusReport_*.json` (7 KB) | DB | `contentJson` |
| `Config.DM.json` (수 KB) | DB | `contentJson` + 인텐시티 요약 |
| DM 이미지 (`*.png`, ~100 KB × 다수) | DB `Bytes` (bytea) | `contentBinary` |
| Logs 폴더 | **무시** | — |
| 설치파일 MSI | **무시** (별도 영역) | — |

이미지는 번들당 3~10장 × 100KB ≈ 1MB. 25대 × 평균 5번들 ≈ 125MB. 충분히 감당 가능.

### 4.2 사용자 워크플로우 — 브라우저 폴더 업로드

1. 캡처 PC에서 평소처럼 `D:\10. 배포\…` 폴더 작업
2. IntraWorks 열고 `/bundles/new` → "**폴더 업로드**" 클릭
3. 폴더 선택 (단일 번들 / 장비 폴더 / 모델 폴더 / 루트 통째 — **자유**)
4. 브라우저가 폴더 트리 파싱 → 인식된 번들 목록을 미리보기로 표시
5. 사용자가 등록할 번들 체크 → "등록"
6. 브라우저가 파일 내용을 base64로 묶어 서버 전송 → DB 저장
7. `/devices/[id]` "배포 번들" 섹션에 자동 표시

### 4.3 폴더 자동 인식 패턴

브라우저는 `webkitRelativePath`로 각 파일의 상대 경로를 받습니다. 정규식으로 다음 패턴 추출:

```
.*?/([A-Za-z0-9]+)/(\d{8})/(Config|DM Setting)/(.+)
        └ deviceId      └ YYYYMMDD     └ 카테고리       └ 파일명
```

예시:
- `10. 배포/6040DA/6040DA004/20260511/Config/Config.local.json` → device=`6040DA004`, date=`2026-05-11`, cat=`Config`, file=`Config.local.json` ✓
- `6040DA005/20260511/DM Setting/DM.png` → device=`6040DA005`, date=`2026-05-11`, cat=`DM`, file=`DM.png` ✓
- `Config/Config.local.json` (deviceId 없음) → 인식 실패 → 수동 등록 안내

### 4.4 장비 매칭

폴더명 `6040DA004` → DB `Device.deviceId == "6040DA004"` 조회. 매칭되는 장비가 있으면 ✓, 없으면 ⚠ 표시 후 사용자가 수동 선택 또는 무시.

### 4.5 중복 처리

같은 (deviceId, bundleDate) 조합은 unique. 재업로드 시:
- 기본: **덮어쓰기 (replace)** — 기존 번들 삭제 후 새로 생성
- 옵션: **건너뛰기** — 기존 유지

미리보기에서 "이미 등록됨" 배지 표시.

---

## 5. 화면 구성

### 5.1 신규 페이지

| 경로 | 내용 |
|------|------|
| `/bundles` | 전체 번들 목록 (모델·장비·기간 필터) |
| `/bundles/new` | 폴더 경로 입력 → 미리보기 → 등록 |
| `/bundles/[id]` | 번들 상세 (파일 트리 + JSON 뷰 + 이미지 갤러리 + 인텐시티 차트) |
| `/bundles/[id]/compare?to={otherId}` | 같은 장비의 두 번들 비교 |

### 5.2 기존 화면에 추가

| 위치 | 추가 |
|------|------|
| 장비 상세 (`/devices/[id]`) | "배포 번들" 섹션 — 타임라인 + 각 카드에 핵심 카운터 |
| 배포 등록 (`/deploys/new`) | "이 배포에 번들 첨부" 옵션 (선택) — 기존 번들 선택 또는 새 등록 |
| 배포 상세 (배포 이력 클릭) | 매칭된 번들 링크 |
| 사이드바 | "배포 번들" 메뉴 |

### 5.3 번들 상세 — 핵심 화면

```
┌────────────────────────────────────────────────────────────────┐
│ 6040DA004 · 2026-05-11 번들                       [재스캔] [삭제]│
│ 경로: \\server\10.배포\6040DA\6040DA004\20260511              │
│ 등록자: 홍길동 · 등록일: 2026-05-12                              │
│ 연결된 배포: SW 1.0.3.3 (Release #14)                          │
├────────────────────────────────────────────────────────────────┤
│ 시스템 카운터                  인텐시티 요약                    │
│ ─────────────                 ────────────                     │
│ 이미지: 196장                  검출기: 4개 / 모듈: 16           │
│ 시스템 가동: 36h 58m           High 평균: 14.8 (12~18)          │
│ 소스 ON: 50m 56s (227회)       Low  평균: 13.2 (11~15)          │
│ 마지막 캘리: 2026-05-11 12:47                                   │
├────────────────────────────────────────────────────────────────┤
│ ▼ Config (3개)                                                 │
│   📄 Config.local.json      6 KB   [미리보기] [JSON뷰] [diff]   │
│   📄 SystemConfig.json    200 B   [미리보기]                  │
│   📄 StatusReport_…json     7 KB   [미리보기]                  │
│ ▼ DM Setting (3개)                                             │
│   🖼 20260511_132919_vertical.png   139 KB   [열기]            │
│   🖼 20260511_132922_vertical.png    99 KB   [열기]            │
│   🖼 20260511_132924_vertical.png    98 KB   [열기]            │
├────────────────────────────────────────────────────────────────┤
│ 인텐시티 매트릭스 (Config.DM.json)                              │
│ ┌─Detector 0─┬─Detector 1─┬─Detector 2─┬─Detector 3─┐         │
│ │ 모듈별 막대 차트 (High/Low) — 모듈 16개                      │
│ └─────────────────────────────────────────────────────┘        │
│ [이전 번들과 비교]                                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET   | `/api/bundles` | 목록 (필터 지원) |
| POST  | `/api/bundles/scan` | 폴더 경로 스캔 (등록 X, 미리보기용 JSON 반환) |
| POST  | `/api/bundles` | 번들 등록 (스캔 결과 또는 경로 + 옵션) |
| GET   | `/api/bundles/[id]` | 상세 + 파일 목록 |
| GET   | `/api/bundles/[id]/files/[fileId]` | 파일 내용 다운로드 (JSON/텍스트는 DB, 이미지는 경로 redirect) |
| DELETE| `/api/bundles/[id]` | 삭제 (메타·파일 메타 모두 제거, 실제 파일은 보존) |
| GET   | `/api/bundles/[id]/compare?to={otherId}` | 두 번들 diff 결과 |

### 6.1 폴더 스캔 로직 (POST /api/bundles/scan)

```ts
입력: { basePath: string }
처리:
  1. 경로 유효성 검사 (UNC 경로 또는 절대 경로, 사내 망 화이트리스트)
  2. 디렉토리 traverse:
     - {basePath}/Config/*.json     → 파일 목록 + 작은건 내용 같이 읽기
     - {basePath}/DM Setting/*.{json,png} → 메타만 (이미지는 메타만)
     - {basePath}/Logs/             → 디렉토리 존재 여부만
  3. SystemConfig.json 발견 시 카운터 추출
  4. Config.DM.json 발견 시 인텐시티 요약 계산
  5. (deviceId, bundleDate) 자동 추론:
     - 폴더명에서 추출 ({장비ID}/{YYYYMMDD})
     - DB에 매칭되는 Device 찾기
출력: { device, bundleDate, summary, files[], warnings[] }
```

### 6.2 보안

- 화이트리스트된 경로(예: `\\<사내서버>\10.배포\` 또는 `\\?\D:\10.배포\`)만 스캔 허용
- 경로 입력 시 `..`, `~` 같은 traversal 차단
- 파일 크기 상한 (예: 단일 파일 10 MB) — 초과 시 메타만 등록

---

## 7. 인텐시티 시각화 상세

`Config.DM.json` 구조:
```json
[
  { "DetectorIndex": 0, "Modules": [{ "High": 16, "Low": 16 }, …] },
  { "DetectorIndex": 1, "Modules": [...] },
  …
]
```

### 화면 1 — 검출기별 모듈 차트
- 검출기 N개 = N개 행
- X축: 모듈 인덱스 (0~15)
- Y축: 값 (대략 8~20 범위)
- 두 시리즈: High (실선) / Low (점선)

### 화면 2 — 히트맵
- detector × module 격자, 셀 색상 = 값 크기
- High / Low 두 개 격자

### 화면 3 — 두 번들 비교 (diff)
- 각 (det, mod, hi/lo) 셀의 변화량을 색상으로 표시
- 변화 ≥ 임계값(예: 2) 이면 강조

---

## 8. 단계별 작업 (W3 → W3.5 → W4)

### W3 (이번 주) — 데이터 모델 + 폴더 스캔 + 등록
1. Prisma 스키마 추가 (`DeploymentBundle`, `DeploymentBundleFile`)
2. `prisma/sql/2026-04-30_add_deployment_bundle.sql` 마이그레이션
3. `POST /api/bundles/scan` — 폴더 경로 스캔 (Node.js fs)
4. `POST /api/bundles` — 등록
5. `/bundles/new` 페이지 (경로 입력 → 미리보기 → 등록 확정)
6. `/bundles` 목록 페이지
7. 사이드바 "배포 번들" 메뉴

### W3.5 — 번들 상세 화면
1. `GET /api/bundles/[id]` + `/api/bundles/[id]/files/[fileId]`
2. `/bundles/[id]` — 파일 트리 + JSON 뷰어 + 이미지 갤러리
3. 시스템 카운터·인텐시티 요약 카드
4. 장비 상세에 번들 섹션 추가

### W4 — 인텐시티 시각화 + 번들 비교
1. recharts 활용 모듈별 차트
2. 두 번들 비교 페이지
3. 배포 등록 폼에 "번들 첨부" 옵션
4. 배포 ↔ 번들 자동 매칭 (같은 장비, ±N일 이내)

---

## 9. 명시적 비범위

- 실제 파일을 IntraWorks 서버에 복사·저장 (디스크 부담)
- 이미지 자동 분석/판독 (이건 운영 영역)
- 자동 폴더 동기화 (캡처 PC ↔ 사내 서버) — robocopy 스크립트로 별도 처리
- DM 이미지 편집 기능

---

## 10. 결정 필요사항

진행 전 확인 부탁:

1. **폴더 접근 경로** — 사내 파일서버에 `\\server\10.배포\…` UNC 경로로 마운트되어 있는지? IntraWorks 서버에서 그 경로를 읽을 수 있어야 함. (현재 `D:\10. 배포\`는 캡처 PC 로컬일 텐데, 서버에서도 보여야 함)
2. **Logs 폴더** — 등록 안 하고 무시해도 OK? (100100DA만 있고 양이 큼)
3. **번들·배포 이력 매칭** — 자동 매칭 (같은 장비, 같은 날짜) vs 수동 선택?
4. **설치파일 폴더(`6040DA/설치파일/*.msi`)** — 별도로 W1 Release artifactPath 채울 백필 스크립트 필요? (현재 14개 SW 릴리스에 대부분 빈 산출물)

---

## 11. 한 줄 요약

> 현장 폴더의 `{모델}/{장비}/{YYYYMMDD}/{Config|DM Setting|Logs}` 구조를
> **DeploymentBundle** 한 단위로 캡슐화하고,
> JSON은 DB에, 큰 이미지는 경로만 저장해서
> **배포 이력 + 시스템 카운터 + 인텐시티 변화**를 한 화면에서 추적합니다.
