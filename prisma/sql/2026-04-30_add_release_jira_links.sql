-- ============================================================
-- Release 테이블에 Jira 프로젝트 연결 컬럼 추가
-- (Two-Project 운영: 개발용 + 품질/납품용)
-- 작성일: 2026-04-30
-- ============================================================
ALTER TABLE "tb_release"
    ADD COLUMN IF NOT EXISTS "jira_dev_key"     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "jira_qm_key"      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "jira_fix_version" VARCHAR(100);
