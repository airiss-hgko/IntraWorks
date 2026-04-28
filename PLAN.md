# IntraWorks — 사내 통합 관리 시스템

> **프로젝트명**: IntraWorks
> **프로젝트 유형**: 별도 프로젝트 (AIXAC.RX.SW.DA와 독립)
> **목적**: 엑셀 기반 배포/장비 관리를 웹 기반 중앙 관리 시스템으로 전환 + 사내 업무 통합 관리
> **현재 상태**: Phase A MVP 운영 중 (2026-04-28 기준) — 장비 25대 / 배포 이력 17건 import 완료, 탭형 분류 + 그룹 헤더 UI 적용

---

## 기술 스택 (확정)

| 영역 | 기술 | 선택 근거 |
|------|------|-----------|
| **프레임워크** | Next.js 14+ (App Router) | 풀스택 (프론트 + API Routes), SSR 지원 |
| **언어** | TypeScript | 타입 안정성, React 생태계 |
| **ORM** | Prisma | PostgreSQL 연동, 타입 자동 생성 |
| **DB** | PostgreSQL | 기존 장비에서도 사용 중, 스키마 호환 |
| **인증** | NextAuth.js + JWT | 관리자 로그인 |
| **배포** | Docker Compose | Next.js + PostgreSQL 컨테이너화, 리눅스 서버 배포 |

> **결정 사항**: ASP.NET Core 백엔드 없이 Next.js 풀스택으로 구성. 장비 18대 + 관리자 몇 명 규모에서 별도 백엔드는 불필요.

---

## 프로젝트 구조

```
IntraWorks/
├── docker-compose.yml        # Next.js + PostgreSQL
├── Dockerfile
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma         # DB 스키마
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # 대시보드 (메인)
│   │   ├── layout.tsx
│   │   ├── devices/          # 장비 관리
│   │   │   ├── page.tsx      # 장비 목록
│   │   │   └── [id]/
│   │   │       └── page.tsx  # 장비 상세
│   │   ├── deploys/          # 배포 이력
│   │   │   └── page.tsx
│   │   ├── reports/          # 주간 보고 (향후)
│   │   ├── docs/             # 문서 관리 (향후)
│   │   └── api/              # API Routes
│   │       ├── devices/
│   │       ├── deploys/
│   │       └── config-snapshots/
│   ├── components/           # UI 컴포넌트
│   └── lib/                  # DB 클라이언트, 유틸
└── PLAN.md
```

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    웹 브라우저 (관리자)                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              Next.js (프론트 + API Routes)                 │
│   ┌──────────┬──────────┬──────────┬──────────┐         │
│   │ 장비 관리  │ 배포 이력  │ Config   │ 대시보드  │         │
│   │  페이지   │  페이지   │ 조회     │  페이지   │         │
│   └──────────┴──────────┴──────────┴──────────┘         │
│              Prisma ORM                                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  PostgreSQL (중앙 DB)                      │
│   ┌──────────┬──────────┬──────────┬──────────┐         │
│   │ tb_device│tb_deploy │tb_config │ tb_user  │         │
│   │          │ _history │_snapshot │          │         │
│   └──────────┴──────────┴──────────┴──────────┘         │
└─────────────────────────────────────────────────────────┘
                      ▲
                      │ Status Report JSON 수동 업로드
                      │ (향후: 자동 동기화)
┌─────────────────────┴───────────────────────────────────┐
│              현장 장비 (AIXAC-RX)                          │
│         Phase 1: Config.local.json                       │
│         Phase 1: tb_config_history (로컬 SQLite)          │
│         Phase 1: StatusReport JSON 내보내기               │
└─────────────────────────────────────────────────────────┘
```

---

## 1. 현황 분석

### 1.1 현재 관리 방식

현재 장비 및 배포 이력은 엑셀 파일(`3-H.소프트웨어 버전 및 배포관리(최종)_26.02.12.xlsx`)로 관리 중.

**엑셀 시트 구성:**

| 시트 | 용도 | 주요 컬럼 |
|------|------|-----------|
| 개정 이력 | 문서 관리 번호/개정 이력 | 문서번호(SW-F-008), 개정번호, 일자, 내용, 작성자, 승인자 |
| SW버전 및 배포관리 | **장비 대장** (18대) | NO, 제품명, 모델명, LOT번호, 고유번호(S/N), 상태, 판매처, SW/AI/PLC 버전, 최근풀날짜, 배포관리 |
| 버전관리 | 버전 규칙 정의 | Major.Minor.Build.Revision 규칙 설명 |
| 배포이력관리 | **배포 이력** (15건+) | NO, 제품명, 모델명, LOT번호, S/N, 설치처, SW/AI/PLC 버전, 배포일시, 배포자, 내용 |

### 1.2 현재 장비 현황 (25대 — 2026-04-14 엑셀 기준)

| 모델명 | 대수 | 판매처 | 비고 |
|--------|------|--------|------|
| AIXAC-RX6040S | 2 | Singapore (TeleRadio) | |
| AIXAC-RX6040SA | 7 | Taiwan (ShenYau), USA (Xonar), Korea | 가장 많은 모델 |
| AIXAC-RX5030SA | 3 | Korea (우정국, 구치소), 미국 | |
| AIXAC-RX6040DA | 4 | Korea (KTL, 항공보안인증), 필리핀 | 듀얼뷰 모델 |
| AIXAC-RX7555SA | 2 | Korea (우정국) | 대형 모델 |
| AIXAC-RX6040MD | 1 | Korea | 의료용 |
| AIXAC-RX100100DA | 4 | Korea, 필리핀 | 신모델 |
| XIS-B | 1 | Korea | 방사선조사기, 보관 |

**판매 지역**: 한국, 싱가포르, 대만, 미국, 필리핀 (5개국)

### 1.3 현재 방식의 문제점

| 문제 | 설명 | 영향 |
|------|------|------|
| **동시 편집 불가** | 엑셀 파일은 한 명만 수정 가능 | 배포 직후 기록 누락 위험 |
| **버전 충돌** | 여러 사본 존재 시 어느 것이 최신인지 불명확 | 잘못된 버전 정보로 유지보수 |
| **검색/필터 제한** | "이 고객에게 납품한 장비 목록" 같은 조회가 수동 | 유지보수 계획 수립 시간 증가 |
| **이력 추적 어려움** | 배포 이력이 별도 시트, 장비별 연결 수동 | 특정 장비의 전체 이력 파악 어려움 |
| **알림/기한 없음** | 캘리브레이션 기한, 소스 교체 주기 등 수동 관리 | 예방정비 누락 위험 |
| **원격 접근 불가** | 현장 출장 시 엑셀 파일 접근 어려움 | 현장에서 장비 이력 확인 불가 |
| **Config 설정 이력 미연동** | Phase 1에서 장비별로 DB에 쌓이는 Config 스냅샷을 중앙에서 볼 수 없음 | 장비별 설정 차이 비교 불가 |

---

## 2. 타사 장비 관리 시스템 비교

### 2.1 보안검색 장비 업계

| 회사 | 시스템명 | 주요 기능 | 기술 스택 |
|------|----------|-----------|-----------|
| **Smiths Detection** | iNET (Intelligent Network) | 원격 모니터링, SW 원격 배포, 장비 상태 대시보드, 알림 | 클라우드 기반 웹 |
| **Rapiscan** | RAP-ID Central Management | 다중 장비 관리, 이미지 중앙 저장, TIP 성과 분석 | 클라우드/온프레미스 |
| **Leidos** | DICOS Central Server | 장비 등록, 설정 배포, 이미지 아카이브, 감사 로그 | 온프레미스 서버 |
| **Nuctech** | WeKnow Platform | IoT 센서 연동, 예측정비, 가동률 대시보드 | 클라우드 + IoT |
| **IDSS (L3)** | CertScan | 중앙 이미지 관리, 원격 판독, 통계 분석 | 온프레미스 |

### 2.2 산업용 장비 관리 (유사 도메인)

| 분야 | 대표 시스템 | 핵심 기능 |
|------|------------|-----------|
| **의료기기** | Siemens teamplay | 장비 가동률, 원격 진단, 예방정비 |
| **반도체 장비** | SECS/GEM + EES | 장비 상태 실시간 수집, 레시피 관리, 이력 추적 |
| **팩토리 자동화** | MES (Manufacturing Execution System) | 설비 등록, 유지보수 이력, 알림 |

### 2.3 우리에게 적용 가능한 범위

현재 장비 규모(18대)와 인력 규모를 고려하면, 대기업 수준의 클라우드 플랫폼은 과잉 투자. **온프레미스 웹 애플리케이션**으로 시작하되, 향후 확장 가능한 구조가 적절.

| 기능 | 우선순위 | 근거 |
|------|----------|------|
| 장비 대장 (등록/조회/수정) | **P0 필수** | 엑셀 "SW버전 및 배포관리" 시트 대체 |
| 배포 이력 관리 | **P0 필수** | 엑셀 "배포이력관리" 시트 대체 |
| SW/AI/PLC 버전 추적 | **P0 필수** | 현재 엑셀에서 수동 관리 중 |
| Config 설정 조회/비교 | **P1 중요** | Phase 1 tb_config_history 연동 |
| 대시보드 (장비 현황 요약) | **P1 중요** | 전체 장비 상태 한눈에 파악 |
| 주간 보고 관리 | **P1 중요** | 사내 업무 보고 통합 |
| 문서 관리 | **P2 향후** | 사내 문서 중앙 관리 |
| 유지보수 일정/알림 | **P2 향후** | 캘리브레이션, 소스 교체 주기 관리 |
| 원격 상태 모니터링 | **P2 향후** | 장비 온라인 여부, 실시간 상태 |
| SW 원격 배포 | **P3 장기** | 현장 방문 없이 업데이트 (VPN 필요) |

---

## 3. DB 스키마 설계

### 3.1 tb_device (장비 대장)

엑셀 "SW버전 및 배포관리" 시트를 DB화.

```sql
CREATE TABLE tb_device (
    id              SERIAL PRIMARY KEY,
    product_name    VARCHAR(100) NOT NULL,       -- 제품명 (예: "AIXAC-RX6040DA")
    model_name      VARCHAR(100) NOT NULL,       -- 모델명 (예: "RX6040DA")
    lot_number      VARCHAR(50),                 -- LOT번호
    serial_number   VARCHAR(50) NOT NULL UNIQUE, -- 고유번호(S/N) (예: "XSDA-DJ08-003")
    device_id       VARCHAR(50) NOT NULL UNIQUE, -- 장비ID (예: "6040DA003")
    status          VARCHAR(20) NOT NULL,        -- 상태: "판매완료", "보관", "수리중", "폐기"
    customer_name   VARCHAR(200),                -- 판매처/고객명
    customer_country VARCHAR(50),                -- 판매국가
    install_location VARCHAR(200),               -- 설치 장소

    -- 현재 버전 정보 (최신 배포 기록에서 자동 갱신)
    current_sw_version  VARCHAR(50),             -- 현재 SW 버전
    current_ai_version  VARCHAR(50),             -- 현재 AI 버전
    current_plc_version VARCHAR(50),             -- 현재 PLC 버전

    -- 유지보수 정보
    last_deploy_date    TIMESTAMP,               -- 최근 배포 날짜
    last_maintenance_date TIMESTAMP,             -- 최근 유지보수 날짜
    next_calibration_due  TIMESTAMP,             -- 다음 캘리브레이션 예정일
    source_on_count     INT DEFAULT 0,           -- 소스 ON 누적 횟수 (Phase 1 연동)

    -- 메타
    notes           TEXT,                        -- 비고
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.2 tb_deploy_history (배포 이력)

엑셀 "배포이력관리" 시트를 DB화.

```sql
CREATE TABLE tb_deploy_history (
    id              SERIAL PRIMARY KEY,
    device_id       INT NOT NULL REFERENCES tb_device(id),

    -- 배포 버전
    sw_version      VARCHAR(50),                 -- 배포한 SW 버전
    ai_version      VARCHAR(50),                 -- 배포한 AI 버전
    plc_version     VARCHAR(50),                 -- 배포한 PLC 버전

    -- 배포 정보
    deploy_date      TIMESTAMP NOT NULL,         -- 배포일시
    deployer         VARCHAR(100),               -- 배포자
    receiver         VARCHAR(100),               -- 수령자 (사내배포관리용)
    deploy_type      VARCHAR(50),                -- "신규설치", "업데이트", "유지보수", "긴급패치"
    install_location VARCHAR(200),               -- 배포 시점 설치처 (장비이전 시 device.install_location과 다를 수 있음)
    description      TEXT,                       -- 배포 내용/사유

    -- Config 스냅샷 (Phase 1 연동)
    config_snapshot TEXT,                         -- 배포 시점의 Config.local.json 내용

    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.3 tb_config_snapshot (설정 이력 — Phase 1 연동)

Phase 1의 Status Report JSON을 중앙 DB에 업로드하여 보관.

```sql
CREATE TABLE tb_config_snapshot (
    id              SERIAL PRIMARY KEY,
    device_id       INT NOT NULL REFERENCES tb_device(id),
    config_version  INT,                         -- Config 스키마 버전
    sw_version      VARCHAR(50),
    snapshot_json   TEXT NOT NULL,                -- Config 전체 내용 (JSON)
    trigger_type    VARCHAR(50),                  -- "AppStart", "ConfigChanged", "ManualUpload", "Deploy"
    source          VARCHAR(50),                  -- "StatusReport", "DirectSync", "ManualEntry"
    captured_at     TIMESTAMP NOT NULL,           -- 원본 캡처 시각 (장비 시각)
    uploaded_at     TIMESTAMP DEFAULT NOW()       -- 중앙 DB 등록 시각
);
```

### 3.4 tb_maintenance_log (유지보수 이력)

```sql
CREATE TABLE tb_maintenance_log (
    id              SERIAL PRIMARY KEY,
    device_id       INT NOT NULL REFERENCES tb_device(id),
    maintenance_type VARCHAR(50) NOT NULL,        -- "캘리브레이션", "소스교체", "검출기교체", "SW업데이트", "점검"
    performed_by    VARCHAR(100),                 -- 수행자
    performed_at    TIMESTAMP NOT NULL,
    description     TEXT,                         -- 수행 내용
    next_due_date   TIMESTAMP,                   -- 다음 예정일 (있는 경우)
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.5 엑셀 → DB 필드 매핑

| 엑셀 컬럼 (SW버전 및 배포관리) | DB 필드 (tb_device) |
|-------------------------------|---------------------|
| NO | id |
| 제품명 | product_name |
| 모델명 | model_name |
| LOT번호 | lot_number |
| 고유번호(S/N) | serial_number |
| 상태 | status |
| 판매처 | customer_name + customer_country |
| S/W버전 | current_sw_version |
| AI버전 | current_ai_version |
| PLC버전 | current_plc_version |
| 최근풀날짜 | last_deploy_date |
| 사내배포관리(배포자) | → tb_deploy_history.deployer |
| 사내배포관리(배포날짜) | → tb_deploy_history.deploy_date |
| 사내배포관리(수령자) | → tb_deploy_history.receiver |
| 비고 | notes |

| 엑셀 컬럼 (배포이력관리) | DB 필드 (tb_deploy_history) |
|-------------------------|---------------------------|
| NO | id |
| 제품명, 모델명, LOT번호, S/N | → device_id (FK) |
| 설치처 | → tb_device.install_location |
| S/W버전 | sw_version |
| AI버전 | ai_version |
| PLC버전 | plc_version |
| 배포일시 | deploy_date |
| 배포자 | deployer |
| 내용 | description |

---

## 4. 웹 화면 구성

### 4.1 대시보드 (메인)

```
┌──────────────────────────────────────────────────────────────┐
│  IntraWorks                                  [관리자명] [로그아웃] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │  18대   │  │  14대   │  │  2대   │  │  2대   │            │
│  │  전체   │  │ 판매완료 │  │  보관  │  │ 수리중  │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│  [모델별 분포 차트]          [국가별 분포 차트]                  │
│                                                              │
│  최근 배포 이력 (5건)                                          │
│  ┌──────┬────────┬────────┬──────┬──────┐                   │
│  │ 장비  │ 버전    │ 배포일  │ 배포자│ 내용  │                   │
│  ├──────┼────────┼────────┼──────┼──────┤                   │
│  │ ...  │ ...    │ ...    │ ...  │ ...  │                   │
│  └──────┴────────┴────────┴──────┴──────┘                   │
│                                                              │
│  ⚠ 알림                                                      │
│  - XSDA-DJ08-003: 캘리브레이션 기한 7일 남음                    │
│  - XSDA-CU27-002: 소스 ON 횟수 10,000회 초과                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 장비 대장 (목록/상세)

**목록 화면:**
- 테이블: 제품명, 모델명, S/N, 상태, 판매처, 현재 버전, 최근 배포일
- 필터: 모델명, 상태, 판매국가
- 검색: S/N, 판매처, 장비ID
- 액션: 신규 등록, Excel 내보내기

**상세 화면:**
- 장비 기본 정보 (수정 가능)
- 현재 버전 정보
- 배포 이력 타임라인
- Config 스냅샷 이력 (Phase 1 연동)
- 유지보수 이력
- Config 비교 (다른 장비 또는 이전 버전과 diff)

### 4.3 배포 이력

- 배포 등록 폼: 장비 선택 → 버전 입력 → 배포자/일시 → 내용
- 배포 시 tb_device의 현재 버전 자동 갱신
- Status Report JSON 업로드 기능 (Phase 1 연동)

### 4.4 Config 비교 뷰

```
┌─────────────────────┬─────────────────────┐
│  6040DA002 (개발기)   │  6040DA003 (양산기)  │
│  2026-03-20 스냅샷    │  2026-03-25 스냅샷   │
├─────────────────────┼─────────────────────┤
│  Device.DeviceId:   │  Device.DeviceId:   │
│  "6040DA002"        │  "6040DA003"        │ ← 차이
│                     │                     │
│  AI.Model.Sharp:    │  AI.Model.Sharp:    │
│  IsUsing: false     │  IsUsing: true      │ ← 차이
│                     │                     │
│  ImageProcessing:   │  ImageProcessing:   │
│  IsHiddenSave: false│  IsHiddenSave: true │ ← 차이
└─────────────────────┴─────────────────────┘
```

---

## 5. Phase 1 연동 방식

Phase 1 (AIXAC.RX.SW.DA 프로젝트)에서 구현하는 기능과 IntraWorks의 연동:

| Phase 1 산출물 | IntraWorks 연동 방식 | 비고 |
|---------------|---------------------|------|
| `tb_config_history` (로컬 DB) | Status Report JSON으로 내보내기 → 웹에 업로드 | 초기: 수동 업로드 |
| `StatusReport_{DeviceId}_{날짜}.json` | 웹 UI에서 드래그앤드롭 업로드 → tb_config_snapshot에 저장 | P0 |
| `ConfigVersion` 필드 | 중앙 DB에서 장비별 Config 스키마 버전 추적 | 호환성 관리 |
| Config.local.json (장비별 설정) | 웹에서 설정 비교/확인 (직접 수정은 현장에서만) | 읽기 전용 |

**향후 자동 동기화 (확장):**
- 장비가 온라인일 때 주기적으로 Status Report를 중앙 서버에 전송
- 웹에서 설정 변경 → 장비에 푸시 (VPN/보안 네트워크 필요)

---

## 5.5 설치처 분류 체계 (SiteCategory)

장비/배포 이력을 설치처 성격에 따라 자동 분류해 탭으로 그룹핑.

| 카테고리 | 매칭 룰 (정규식) | 예시 |
|----------|------------------|------|
| **우정국** | `우정국 \| 우체국 \| 우편` | "광화문 우체국", "제주 우편집중국", "우정국(광화문)" |
| **교정시설** | `구치소 \| 교도소` | "울산 구치소", "대구 구치소" |
| **시험·인증기관** | `^KTL\b \| 항공보안인증` | "KTL", "항공보안인증" |
| **해외** | 시작 토큰이 외국 국가명 또는 customerCountry가 외국 | "대만(...)", "싱가폴(...)", "필리핀" |
| **기타** | 어디에도 속하지 않으면 fallback | "대전TP", customer 없는 보관 장비 |

- 외국 국가 화이트리스트: 대만/미국/싱가폴/싱가포르/필리핀/일본/중국/베트남/태국/인도네시아/말레이시아/인도/독일/프랑스/영국/호주/캐나다/멕시코/브라질/아랍에미리트/사우디아라비아
- 룰 위치: [`src/lib/site-category.ts`](src/lib/site-category.ts) — 신규 카테고리/룰 추가 시 이 파일만 수정
- 향후 해외가 충분히 많아지면 국가별로 다시 탭 분리하거나 sub-필터 칩 추가 (구조 변경 없이 룰만 수정)

---

## 6. 구현 로드맵

### Phase A 진행 상황 (2026-04-28)

✅ 완료
- 기본 인증, 사이드바, 다크모드, 대시보드 골격
- 장비 CRUD (목록 + 상세 + 등록/수정/삭제)
- 배포 이력 CRUD + 인라인 편집(전체 필드 수정 지원)
- Config 스냅샷 업로드/조회/비교
- 25대 장비 + 17건 배포 이력 엑셀 마이그레이션 (`scripts/import-devices.ts`, `scripts/import-deploys.ts`)
- 장비 목록: SW만 표시, sticky 헤더, 정렬 가능 컬럼, 압축 행
- **설치처 분류 탭 + 그룹 헤더 UI** (장비 페이지 / 배포 이력 페이지 양쪽)
- DeployHistory에 `install_location` 컬럼 추가 (장비이전 대응)
- Excel 내보내기

🟡 보강 예정
- `/deploys/new` 등록 폼에 `installLocation` 입력 필드 추가
- `장비이전` 상태 색상 정식 채택 여부 결정
- `deviceId` 컬럼 제거 마이그레이션 (S/N과 중복)

### Phase A: MVP (최소 기능 — 엑셀 대체)

**목표**: 엑셀 파일을 완전히 대체할 수 있는 최소 기능

| 기능 | 설명 |
|------|------|
| 장비 등록/조회/수정 | tb_device CRUD |
| 배포 이력 등록/조회 | tb_deploy_history CRUD |
| 엑셀 데이터 마이그레이션 | 기존 18대 + 15건 이력 import |
| 기본 검색/필터 | 모델명, 상태, 판매처로 필터 |
| Excel 내보내기 | 기존 엑셀 형식으로 내보내기 |
| 관리자 인증 | 로그인/로그아웃 |

### Phase B: Config 연동 + 대시보드 + 업무 관리

| 기능 | 설명 |
|------|------|
| Status Report 업로드 | JSON 파일 업로드 → Config 스냅샷 저장 |
| Config 비교 뷰 | 장비간/시점간 설정 diff |
| 대시보드 | 장비 현황 요약, 최근 배포, 모델별/국가별 통계 |
| 유지보수 이력 | 캘리브레이션, 소스교체 등 기록 |
| 주간 보고 | 업무 내용 작성/조회 |

### Phase C: 알림 + 모니터링 + 문서 관리

| 기능 | 설명 |
|------|------|
| 유지보수 알림 | 캘리브레이션 기한, 소스 교체 주기 알림 |
| 원격 상태 확인 | 장비 온라인 여부 (ping/heartbeat) |
| 이메일/슬랙 알림 | 중요 이벤트 알림 전송 |
| 사내 문서 관리 | 문서 업로드/검색/버전 관리 |

---

## 7. 엑셀 데이터 마이그레이션 계획

기존 엑셀 데이터를 새 DB로 이전하기 위한 매핑:

### 7.1 장비 대장 (18대)

```
엑셀 "SW버전 및 배포관리" 시트
→ 각 행을 tb_device INSERT

특이 사항:
- "판매처" 컬럼에 국가+회사가 혼합 → customer_name, customer_country 분리
  예: "싱가포르 TeleRadio" → country: "Singapore", name: "TeleRadio Engineering"
- "상태"가 "판매완료", "보관" 2종류 → 그대로 유지, 추가 상태 "수리중", "폐기" 가능
- "사내배포관리"의 배포자/배포날짜/수령자 → tb_deploy_history로 분리
```

### 7.2 배포 이력 (15건+)

```
엑셀 "배포이력관리" 시트
→ 각 행을 tb_deploy_history INSERT

특이 사항:
- 장비 식별: S/N으로 tb_device.id 매칭
- "내용" 컬럼 → description 필드로 매핑
- deploy_type 자동 분류: 첫 배포 = "신규설치", 이후 = "업데이트"
```

---

## 8. 보안 고려사항

| 항목 | 방안 |
|------|------|
| **인증** | NextAuth.js + JWT, 관리자만 접근 |
| **DB 비밀번호** | Config 스냅샷 저장 시 DB 비밀번호 마스킹 (Phase 1과 동일) |
| **네트워크** | 사내 네트워크에서만 접근 (VPN 또는 사내 IP 제한) |
| **HTTPS** | 자체 서명 인증서 또는 Let's Encrypt |
| **감사 로그** | 모든 CRUD 작업에 대한 변경 이력 기록 |

---

## 9. Docker 배포

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/intraworks
    depends_on:
      - db
    restart: always

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=intraworks
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

volumes:
  pgdata:
```

```bash
# 리눅스 서버 배포
docker compose up -d
```

---

## 10. 참고: 엑셀 원본 데이터 요약

아래는 엑셀 파일에서 추출한 주요 데이터 (마이그레이션 시 참조용):

### 장비 목록 (일부)

| NO | 제품명 | 모델명 | S/N | 상태 | 판매처 |
|----|--------|--------|-----|------|--------|
| 1 | AIXAC-RX6040S | RX6040S | XSSA-CG22-001 | 판매완료 | 싱가포르 TeleRadio |
| 2 | AIXAC-RX6040S | RX6040S | XSSA-CG22-002 | 판매완료 | 싱가포르 TeleRadio |
| 5 | AIXAC-RX6040SA | RX6040SA | XSSA-DB20-001 | 판매완료 | 대만 ShenYau |
| 8 | AIXAC-RX5030SA | RX5030SA | XSSA-CC12-001 | 판매완료 | 우정국 |
| 11 | AIXAC-RX6040DA | RX6040DA | XSDA-DJ08-001 | 판매완료 | KTL 인증 |
| 15 | AIXAC-RX7555SA | RX7555SA | XSSA-EE20-001 | 보관 | - |

### 배포 이력 (최근 5건 예시)

| S/N | SW버전 | AI버전 | PLC버전 | 배포일시 | 배포자 | 내용 |
|-----|--------|--------|---------|----------|--------|------|
| XSSA-DB20-001 | 1.0.4.3 | 1.0.3 | RX.v.3.2.1.0 | 2025-12-20 | - | 대만 ShenYau 납품 |
| XSDA-DJ08-003 | 2.0.0.0 | - | RX.v.5.3.2.0 | 2026-02-12 | - | 항공보안인증 |
