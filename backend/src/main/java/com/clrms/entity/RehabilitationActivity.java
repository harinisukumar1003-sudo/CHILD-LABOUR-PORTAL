package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "rehabilitation_activities", indexes = {
        @Index(name = "idx_rehab_activity_case_date", columnList = "rehabilitation_case_id,activity_date"),
        @Index(name = "idx_rehab_follow_up", columnList = "next_follow_up_date")
})
@Getter @Setter @NoArgsConstructor
public class RehabilitationActivity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rehabilitation_case_id", nullable = false)
    private Long rehabilitationCaseId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RehabilitationActivityType activityType;
    @Column(nullable = false, length = 2000)
    private String description;
    @Column(nullable = false, length = 180)
    private String providerName;
    @Column(nullable = false)
    private LocalDate activityDate;
    @Column(length = 2000)
    private String outcomeNotes;
    private LocalDate nextFollowUpDate;
    @Column(nullable = false)
    private Long recordedByUserId;
}