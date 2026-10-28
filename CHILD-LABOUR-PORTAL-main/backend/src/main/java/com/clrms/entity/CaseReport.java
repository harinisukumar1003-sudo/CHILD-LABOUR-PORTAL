package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import com.clrms.util.SensitiveDataConverter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "case_reports", indexes = {
        @Index(name = "idx_case_reporter", columnList = "reporter_id"),
        @Index(name = "idx_case_filters", columnList = "status,urgency_level,district")
})
@Getter @Setter @NoArgsConstructor
public class CaseReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 15)
    private String caseNumber;

    private Long reporterId;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(length = 512)
    private String reporterName;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(length = 512)
    private String reporterEmail;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(length = 512)
    private String reporterPhone;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(length = 512)
    private String childName;
    private Integer approxAge;
    private String gender;

    @Column(columnDefinition = "TEXT")
    private String childDescription;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String locationAddress;
    @Column(name = "town_or_city", length = 120)
    private String townOrCity;
    private Double latitude;
    private Double longitude;
    @Column(name = "pincode", length = 6)
    private String pincode;
    @Column(name = "landmark", length = 150)
    private String landmark;
    private String district;
    private String state;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String incidentDescription;
    private LocalDate dateOfIncident;

    @Column(nullable = false)
    private boolean anonymous;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private UrgencyLevel urgencyLevel;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private CaseStatus status;

    @Column(name = "assigned_officer_id")
    private Long assignedOfficerId;
    @Column(name = "assigned_at")
    private Instant assignedAt;
    @Column(name = "assigned_ngo_id")
    private Long assignedNgoId;
    @Column(name = "referred_at")
    private Instant referredAt;
    @Column(name = "referral_note", columnDefinition = "TEXT")
    private String referralNote;
    @Column(name = "rehabilitation_accepted_by")
    private Long rehabilitationAcceptedBy;
    @Column(name = "rehabilitation_accepted_at")
    private Instant rehabilitationAcceptedAt;

    @Column(name = "manual_verification_done", nullable = false)
    private boolean manualVerificationDone;
    @Column(name = "manual_verified_by")
    private Long manualVerifiedBy;
    @Column(name = "manual_verified_at")
    private Instant manualVerifiedAt;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "manual_verification_checklist", columnDefinition = "json")
    private Map<String, Boolean> manualVerificationChecklist;
    @Column(name = "manual_verification_notes", columnDefinition = "TEXT")
    private String manualVerificationNotes;

    @Column(unique = true, length = 64)
    private String trackingCode;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "caseReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CaseEvidence> evidence = new ArrayList<>();

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
