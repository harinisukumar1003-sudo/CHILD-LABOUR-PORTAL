-- Apply once to an existing MySQL CLRMS database before deploying this version.
-- The existing notifications table already contains the required recipient, case,
-- message, read-state, and timestamp fields; it is reused without replacing data.
ALTER TABLE case_reports
    ADD COLUMN assigned_officer_id BIGINT NULL,
    ADD COLUMN assigned_at DATETIME(6) NULL,
    ADD INDEX idx_case_reports_assigned_officer_status (assigned_officer_id, status);

UPDATE case_reports report
JOIN case_assignments current_assignment
  ON current_assignment.id = (
      SELECT latest.id
      FROM case_assignments latest
      WHERE latest.case_report_id = report.id
      ORDER BY latest.assigned_at DESC, latest.id DESC
      LIMIT 1
  )
SET report.assigned_officer_id = current_assignment.assigned_officer_id,
    report.assigned_at = current_assignment.assigned_at;

CREATE TABLE case_assignment_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    case_id BIGINT NOT NULL,
    from_officer_id BIGINT NULL,
    to_officer_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_case_assignment_log_case_time (case_id, created_at)
);

INSERT INTO case_assignment_log (case_id, from_officer_id, to_officer_id, assigned_by, created_at)
SELECT assignment.case_report_id,
       (
           SELECT previous.assigned_officer_id
           FROM case_assignments previous
           WHERE previous.case_report_id = assignment.case_report_id
             AND (previous.assigned_at < assignment.assigned_at
                  OR (previous.assigned_at = assignment.assigned_at AND previous.id < assignment.id))
           ORDER BY previous.assigned_at DESC, previous.id DESC
           LIMIT 1
       ),
       assignment.assigned_officer_id,
       assignment.assigned_by_admin_id,
       assignment.assigned_at
FROM case_assignments assignment;
