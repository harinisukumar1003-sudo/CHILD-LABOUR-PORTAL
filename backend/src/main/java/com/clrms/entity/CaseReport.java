package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import com.clrms.util.SensitiveDataConverter;

@Entity
@Table(name = "case_reports", indexes = {
        @Index(name = "idx_case_reporter", columnList = "reporter_id"),
        @Index(name = "idx_case_filters", columnList = "status,urgency_level,district")
})
@Getter @Setter @NoArgsConstructor
public class CaseReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 14)
    private String caseNumber;

    private Long reporterId;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(length = 512)
    private String childName;
    private Integer approxAge;
    private String gender;

    @Column(length = 2000)
    private String childDescription;
    @Convert(converter = SensitiveDataConverter.class)
    @Column(nullable = false, length = 2000)
    private String locationAddress;
    private Double latitude;
    private Double longitude;
    private String district;
    private String state;

    @Column(nullable = false, length = 4000)
    private String incidentDescription;
    @Column(length = 2000)
    private String employerOrLocationDetails;
    private LocalDate dateOfIncident;

    @Column(nullable = false)
    private boolean anonymous;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private UrgencyLevel urgencyLevel;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private CaseStatus status;

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