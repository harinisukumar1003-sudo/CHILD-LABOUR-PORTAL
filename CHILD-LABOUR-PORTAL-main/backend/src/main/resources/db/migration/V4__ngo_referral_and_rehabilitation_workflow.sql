-- Apply once after V3. No case, user, notification, or history rows are deleted.
ALTER TABLE users
    ADD COLUMN ngo_id BIGINT NULL;

UPDATE users
SET ngo_id = ngo_organization_id
WHERE ngo_id IS NULL AND ngo_organization_id IS NOT NULL;

ALTER TABLE ngo_organizations
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN capacity INT NOT NULL DEFAULT 0,
    ADD COLUMN available_beds INT NOT NULL DEFAULT 0;

ALTER TABLE case_reports
    ADD COLUMN assigned_ngo_id BIGINT NULL,
    ADD COLUMN referred_at DATETIME(6) NULL,
    ADD COLUMN referral_note TEXT NULL,
    ADD COLUMN rehabilitation_accepted_by BIGINT NULL,
    ADD COLUMN rehabilitation_accepted_at DATETIME(6) NULL,
    ADD INDEX idx_case_reports_assigned_ngo_status (assigned_ngo_id, status);

ALTER TABLE case_status_history
    ADD COLUMN progress_note TEXT NULL,
    ADD COLUMN center_id BIGINT NULL,
    ADD COLUMN admission_date DATE NULL,
    ADD COLUMN education_update TEXT NULL,
    ADD COLUMN health_update TEXT NULL,
    ADD COLUMN counselling_update TEXT NULL;

CREATE INDEX idx_users_ngo_role_status ON users (ngo_id, role, status);
