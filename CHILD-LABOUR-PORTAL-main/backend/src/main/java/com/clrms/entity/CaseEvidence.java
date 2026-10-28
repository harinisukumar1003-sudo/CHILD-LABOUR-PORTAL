package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "case_evidence")
@Getter @Setter @NoArgsConstructor
public class CaseEvidence {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_report_id", nullable = false)
    private CaseReport caseReport;

    @Column(nullable = false, length = 500)
    private String fileUrl;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private EvidenceFileType fileType;
    @Column(nullable = false, updatable = false)
    private Instant uploadedAt;
    private Long uploadedBy;

    @PrePersist
    void onCreate() { uploadedAt = Instant.now(); }
}