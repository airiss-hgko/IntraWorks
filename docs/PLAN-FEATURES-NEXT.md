# IntraWorks — 다음 기능 3종 플랜

> **작성일**: 2026-05-13
> **범위**: 1순위 번들 비교 + 인텐시티 시각화, 2순위 데이터 품질 알림, 3순위 장비 PDF 리포트
> **단계별 커밋 / 푸시**

---

## 작업 순서

| # | 기능 | 상태 | 작업량 |
|---|------|------|--------|
| 2 | 데이터 품질·이상 감지 알림 (대시보드) | ✅ 구현 완료 — 커밋 대기 | S |
| 1 | 번들 비교 + 인텐시티 시각화 | 진행 예정 | M |
| 3 | 장비 PDF 리포트 자동 생성 | 진행 예정 | M |

각 단계 완료 즉시 커밋·푸시.

---

## #2 — 데이터 품질 알림 (완료)

### 설계 의도
실시간 모니터링 X. 납품·유지보수 시 들어온 데이터를 검토해서 **"지금 누가 봐줘야 하는 항목"** 만 끌어올린다.

### 5가지 카테고리

| 카테고리 | 트리거 | 심각도 |
|---|---|---|
| 인텐시티 이상치 | 같은 모델 평균 대비 ±20% 이상 (최신 번들) | high |
| 번들 없음 | 판매완료·장비이전인데 번들 0건 | warn |
| 배포 이력 없음 (판매완료) | 판매완료인데 배포 0건 | warn |
| 미등록 SW 버전 사용 중 | 깔린 버전이 릴리스 카탈로그에 없음 | info |
| 마지막 배포 후 6개월+ | 판매완료, 최근 배포 6개월 경과 | info |

### 산출물
- `src/lib/dashboard-alerts.ts` — 계산 로직
- `src/components/dashboard/alerts-panel.tsx` — 패널 UI
- 대시보드 `stat 카드` 아래에 통합

### 임계값
- `INTENSITY_DELTA_PERCENT = 20`
- `STALE_MONTHS = 6`
→ 상수로 외부화. 운영하다 조정 가능.

---

## #1 — 번들 비교 + 인텐시티 시각화

### 목표
"이 장비 한 달 전이랑 지금 뭐 달라졌나?" 5분 안에 답.

### 두 가지 화면

#### A. 번들 단건 인텐시티 차트 (`/bundles/[id]` 보강)
- Config.DM.json 데이터로 **detector × module 막대 그래프**
- 검출기마다 1개 차트 (수직/수평 분리)
- X축: 모듈 인덱스 (0~N)
- Y축: 값
- 두 시리즈: High (실선/파랑), Low (점선/주황)
- 차트 라이브러리: `recharts` (이미 설치됨)

#### B. 두 번들 비교 (`/bundles/[id]/compare?to={otherId}`)
- 좌우 분할:
  - 좌측 = 현재 번들
  - 우측 = 비교 대상 번들 (같은 장비 또는 같은 모델 다른 장비)
- **Config diff**: Config.local.json 좌우 diff (추가/변경/삭제 색상)
- **시스템 카운터 diff**: 이미지 수·소스 ON·시스템 가동 시간 변화
- **인텐시티 변화량 차트**: 같은 모듈의 (현재-비교대상) 차이값 막대그래프
- 진입점: 번들 상세에 "다른 번들과 비교" 드롭다운 (같은 장비의 다른 일자, 또는 같은 모델의 최신)

### API 추가
- 기존 `/api/bundles/[id]` 그대로 사용 (contentJson 다 들어있음)
- 비교 페이지는 두 번들을 동시에 fetch — 새 API 안 만듦

### 클라이언트 컴포넌트
- `intensity-chart.tsx` — recharts 막대그래프
- `intensity-diff-chart.tsx` — diff 막대그래프
- `config-json-diff.tsx` — 두 JSON diff 렌더
- `bundle-compare-client.tsx` — 비교 페이지 본체

### Config JSON diff
간단하게 자체 구현 (lodash 안 씀):
- 두 JSON을 평탄화 (`a.b.c = 1`)
- 추가/변경/삭제 키 표시
- 변경된 키만 보이는 옵션

---

## #3 — 장비 PDF 리포트

### 사용 시나리오
고객/검사관이 "이 장비 정보 정리해줘" 요청 → 한 클릭으로 정돈된 PDF 1~2장 생성.

### 포함 내용 (장비 1대 기준)
1. 헤더: 모델·S/N·deviceId·상태·고객
2. 현재 버전: SW/AI/PLC + 릴리스일자(있으면)
3. 최근 배포 5건
4. 최근 번들 1건 요약: 시스템 카운터·DM 설정 요약
5. 유지보수 이력 (전체)
6. 비고

### 구현 방식

서버사이드 HTML → PDF (puppeteer 없이 가볍게):
- Next.js Route Handler `/api/devices/[id]/report.pdf`
- 라이브러리 후보:
  - **`@react-pdf/renderer`** — React 컴포넌트로 PDF 작성, 한글 폰트 직접 포함 필요
  - **`pdfkit`** — 저수준, 자유롭지만 구현 부담
  - **`puppeteer`** — 헤드리스 Chrome, 깔끔하지만 서버 부담 큼
- **결정**: `@react-pdf/renderer` (한글 NotoSans 포함, 의존성 가벼움)

### 한글 폰트
- NotoSansKR 또는 PretendardJP 같은 무료 한글 폰트 1개 `public/fonts/`에 포함
- `@react-pdf/renderer`의 `Font.register`로 로드

### 진입점
- 장비 상세 페이지 헤더에 "📄 PDF 다운로드" 버튼
- 클릭 시 `/api/devices/{id}/report.pdf` 새 탭

### 파일명
- `IntraWorks_{deviceId}_{YYYY-MM-DD}.pdf`

---

## 단계별 커밋 메시지 (예고)

1. **알림 시스템 (#2)**:
   ```
   Add data-quality alerts panel to dashboard
   ```

2. **번들 비교 + 인텐시티 (#1)**:
   ```
   Add intensity chart and bundle comparison view
   ```

3. **PDF 리포트 (#3)**:
   ```
   Add per-device PDF report generation
   ```

---

## 명시적 비범위

- 알림 이메일/Slack 발송 — 운영 부담
- 모바일 앱 — 반응형 웹 충분
- 실시간 모니터링 — 사용자 워크플로우 미스매치
- 다국어 PDF — 한글만
- 다중 장비 일괄 PDF — 단건만 (필요해지면 추가)
