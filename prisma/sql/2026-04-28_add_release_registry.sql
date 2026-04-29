-- ============================================================
-- Phase B1 — 릴리스 레지스트리 추가
-- 작성일: 2026-04-28
-- ============================================================

-- 1. tb_release 테이블 생성
CREATE TABLE IF NOT EXISTS "tb_release" (
    "id"               SERIAL PRIMARY KEY,
    "component"        VARCHAR(20)  NOT NULL,             -- "SW" | "AI" | "PLC"
    "version"          VARCHAR(50)  NOT NULL,             -- "2.0.0.0"
    "model_name"       VARCHAR(100),                       -- null = 공통, 값 있으면 특정 모델 전용

    "build_date"       TIMESTAMP,
    "builder"          VARCHAR(100),
    "artifact_name"    VARCHAR(255),                       -- "AIXAC.RX.SW.DA-2.0.0.0.zip"
    "artifact_path"    VARCHAR(500),                       -- 사내 파일서버 경로 또는 URL
    "artifact_sha256"  VARCHAR(64),                        -- 무결성 검증용 (선택)

    "changelog"        TEXT,                               -- 마크다운 한글 변경요약
    "release_type"     VARCHAR(20),                        -- "정식" | "베타" | "긴급패치"
    "is_deprecated"    BOOLEAN      NOT NULL DEFAULT false,

    "created_at"       TIMESTAMP    NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 동일 component+version+model_name 중복 방지
-- (model_name이 null인 행은 PostgreSQL UNIQUE에서 중복 허용되지만, 같은 (component, version) 공통 릴리스는 1개만 등록되도록 권장)
CREATE UNIQUE INDEX IF NOT EXISTS "tb_release_component_version_model_name_key"
    ON "tb_release" ("component", "version", "model_name");

-- 2. tb_deploy_history 에 FK 컬럼 3개 추가
ALTER TABLE "tb_deploy_history"
    ADD COLUMN IF NOT EXISTS "sw_release_id"  INT,
    ADD COLUMN IF NOT EXISTS "ai_release_id"  INT,
    ADD COLUMN IF NOT EXISTS "plc_release_id" INT;

-- 3. FK 제약 추가
ALTER TABLE "tb_deploy_history"
    ADD CONSTRAINT "tb_deploy_history_sw_release_id_fkey"
        FOREIGN KEY ("sw_release_id")  REFERENCES "tb_release"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "tb_deploy_history_ai_release_id_fkey"
        FOREIGN KEY ("ai_release_id")  REFERENCES "tb_release"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "tb_deploy_history_plc_release_id_fkey"
        FOREIGN KEY ("plc_release_id") REFERENCES "tb_release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS "tb_deploy_history_sw_release_id_idx"  ON "tb_deploy_history" ("sw_release_id");
CREATE INDEX IF NOT EXISTS "tb_deploy_history_ai_release_id_idx"  ON "tb_deploy_history" ("ai_release_id");
CREATE INDEX IF NOT EXISTS "tb_deploy_history_plc_release_id_idx" ON "tb_deploy_history" ("plc_release_id");
CREATE INDEX IF NOT EXISTS "tb_release_component_idx" ON "tb_release" ("component");
