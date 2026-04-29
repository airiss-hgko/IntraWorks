-- ============================================================
-- Phase B1 — MaintenanceLog 컬럼 확장 (status / cost / attachments / updated_at)
-- 작성일: 2026-04-28
-- ============================================================

ALTER TABLE "tb_maintenance_log"
    ADD COLUMN IF NOT EXISTS "status"      VARCHAR(20) NOT NULL DEFAULT '완료',
    ADD COLUMN IF NOT EXISTS "cost"        INT,
    ADD COLUMN IF NOT EXISTS "attachments" JSONB,
    ADD COLUMN IF NOT EXISTS "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "tb_maintenance_log_device_id_idx"   ON "tb_maintenance_log" ("device_id");
CREATE INDEX IF NOT EXISTS "tb_maintenance_log_performed_at_idx" ON "tb_maintenance_log" ("performed_at");
