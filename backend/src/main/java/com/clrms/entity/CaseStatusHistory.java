package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "case_status_history", indexes = @Index(name = "idx_case_status_history_case_time", columnList = "case_report_id,created_at"))
@Getter @Setter @NoArgsConstructor
public class CaseStatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "case_report_id", nullable = false) private Long caseReportId;
    @Enumerated(EnumType.STRING) @Column(name = "old_status", length = 32) private CaseStatus oldStatus;
    @Enumerated(EnumType.STRING) @Column(name = "new_status", nullable = false, length = 32) private CaseStatus newStatus;
    @Column(name = "actor_user_id") private Long actorUserId;
    @Column(name = "actor_role", nullable = false, length = 20) private String actorRole;
    @Column(columnDefinition = "TEXT") private String details;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
