package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "case_officer_verifications", indexes = {
        @Index(name = "idx_officer_verif_case", columnList = "case_report_id"),
        @Index(name = "idx_officer_verif_user", columnList = "officer_user_id")
})
@Getter
@Setter
@NoArgsConstructor
public class CaseOfficerVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_report_id", nullable = false)
    private Long caseReportId;

    @Column(name = "officer_user_id", nullable = false)
    private Long officerUserId;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(columnDefinition = "TEXT")
    private String outcome;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String observations;

    @Column(name = "verification_result", nullable = false, length = 60)
    private String verificationResult;

    @Column(name = "child_found", nullable = false)
    private Boolean childFound;

    @Column(name = "age_confirmed", nullable = false)
    private Boolean ageConfirmed;

    @Column(name = "work_activity_observed", nullable = false)
    private Boolean workActivityObserved;

    @Column(name = "employer_identified", nullable = false)
    private Boolean employerIdentified;

    @Column(name = "child_in_danger", nullable = false)
    private Boolean childInDanger;

    @Column(name = "guardian_met", nullable = false)
    private Boolean guardianMet;

    @Column(name = "photo_url", length = 1000)
    private String photoUrl;

    @Column(name = "action_taken", nullable = false, columnDefinition = "TEXT")
    private String actionTaken;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(nullable = false, length = 100)
    private String declaration;

    @Column(length = 60)
    private String recommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
