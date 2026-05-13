-- ============================================================
-- Phase B2 — 배포 번들 (DeploymentBundle + DeploymentBundleFile)
-- 작성일: 2026-04-30
-- ============================================================

-- 1. tb_deployment_bundle
CREATE TABLE IF NOT EXISTS "tb_deployment_bundle" (
    "id"                    SERIAL PRIMARY KEY,
    "device_id"             INT NOT NULL REFERENCES "tb_device"("id") ON UPDATE CASCADE,
    "deploy_id"             INT UNIQUE REFERENCES "tb_deploy_history"("id") ON DELETE SET NULL ON UPDATE CASCADE,

    "bundle_date"           TIMESTAMP NOT NULL,
    "base_path"             VARCHAR(500),
    "source"                VARCHAR(30) NOT NULL DEFAULT 'upload',

    -- SystemConfig.json 카운터
    "image_count"           INT,
    "total_system_time"     VARCHAR(20),
    "total_source_time"     VARCHAR(20),
    "source_on_count"       INT,
    "last_calibration_date" TIMESTAMP,

    -- Config.DM.json 인텐시티 요약
    "intensity_detectors"   INT,
    "intensity_modules"     INT,
    "intensity_avg_high"    DOUBLE PRECISION,
    "intensity_avg_low"     DOUBLE PRECISION,
    "intensity_min_high"    INT,
    "intensity_max_high"    INT,
    "intensity_min_low"     INT,
    "intensity_max_low"     INT,

    "notes"        TEXT,
    "uploaded_by"  VARCHAR(100),
    "uploaded_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_deployment_bundle_device_date_key"
    ON "tb_deployment_bundle" ("device_id", "bundle_date");
CREATE INDEX IF NOT EXISTS "tb_deployment_bundle_bundle_date_idx"
    ON "tb_deployment_bundle" ("bundle_date");

-- 2. tb_deployment_bundle_file
CREATE TABLE IF NOT EXISTS "tb_deployment_bundle_file" (
    "id"             SERIAL PRIMARY KEY,
    "bundle_id"      INT NOT NULL REFERENCES "tb_deployment_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    "category"       VARCHAR(20) NOT NULL,    -- "Config" | "DM"
    "file_name"      VARCHAR(255) NOT NULL,
    "relative_path"  VARCHAR(500) NOT NULL,
    "file_size"      INT,
    "file_hash"      VARCHAR(64),
    "content_type"   VARCHAR(100),

    "content_json"   JSONB,
    "content_binary" BYTEA,

    "captured_at"    TIMESTAMP,
    "uploaded_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "tb_deployment_bundle_file_bundle_category_idx"
    ON "tb_deployment_bundle_file" ("bundle_id", "category");
