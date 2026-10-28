package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "case_assignments", indexes = {
        @Index(name = "idx_assignment_case", columnList = "case_report_id"),
        @Index(name = "idx_assignment_officer", columnList = "assigned_officer_id")
})
@Getter @Setter @NoArgsConstructor
public class CaseAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_report_id", nullable = false)
    private Long caseReportId;

    @Column(name = "assigned_officer_id", nullable = false)
    private Long assignedOfficerId;

    @Column(name = "assigned_by_admin_id", nullable = false)
    private Long assignedByAdminId;

    @Column(nullable = false, updatable = false)
    private Instant assignedAt;

    @Column(nullable = false, length = 120)
    private String jurisdiction;

    @Column(length = 2000)
    private String notes;

    @PrePersist
    void onCreate() { assignedAt = Instant.now(); }
}