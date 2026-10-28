package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;

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
    @Column(name = "progress_note", columnDefinition = "TEXT") private String progressNote;
    @Column(name = "center_id") private Long centerId;
    @Column(name = "admission_date") private LocalDate admissionDate;
    @Column(name = "education_update", columnDefinition = "TEXT") private String educationUpdate;
    @Column(name = "health_update", columnDefinition = "TEXT") private String healthUpdate;
    @Column(name = "counselling_update", columnDefinition = "TEXT") private String counsellingUpdate;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
