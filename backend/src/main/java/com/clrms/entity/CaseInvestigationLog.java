package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "case_investigation_logs", indexes = {
        @Index(name = "idx_log_case_created", columnList = "case_report_id,created_at")
})
@Getter @Setter @NoArgsConstructor
public class CaseInvestigationLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_report_id", nullable = false)
    private Long caseReportId;

    @Column(name = "updated_by_user_id", nullable = false)
    private Long updatedByUserId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private CaseStatus previousStatus;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private CaseStatus newStatus;

    @Column(nullable = false, length = 4000)
    private String remarks;

    @Column(length = 1000)
    private String attachmentUrl;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}