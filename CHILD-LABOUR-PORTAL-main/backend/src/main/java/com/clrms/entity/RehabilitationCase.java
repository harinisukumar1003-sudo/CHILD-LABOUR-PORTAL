package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "rehabilitation_cases", uniqueConstraints = @UniqueConstraint(name = "uk_rehab_case_report", columnNames = "case_report_id"))
@Getter @Setter @NoArgsConstructor
public class RehabilitationCase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_report_id", nullable = false, unique = true)
    private Long caseReportId;
    @Column(nullable = false, length = 80)
    private String childAlias;
    @Column(nullable = false)
    private Long rehabilitationCenterId;
    @Column(nullable = false)
    private LocalDate startDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RehabilitationPhase currentPhase;
    @Column(nullable = false)
    private Long assignedCounsellorId;
}