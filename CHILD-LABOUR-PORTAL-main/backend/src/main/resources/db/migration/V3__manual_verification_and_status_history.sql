-- Apply once after V2 to add officer manual verification and ensure the status timeline exists.
ALTER TABLE case_reports
    ADD COLUMN manual_verification_done BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN manual_verified_by BIGINT NULL,
    ADD COLUMN manual_verified_at DATETIME(6) NULL,
    ADD COLUMN manual_verification_checklist JSON NULL,
    ADD COLUMN manual_verification_notes TEXT NULL;

CREATE TABLE IF NOT EXISTS case_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_report_id BIGINT NOT NULL,
    old_status VARCHAR(32) NULL,
    new_status VARCHAR(32) NOT NULL,
    actor_user_id BIGINT NULL,
    actor_role VARCHAR(20) NOT NULL,
    details TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_case_status_history_case_time (case_report_id, created_at)
);
