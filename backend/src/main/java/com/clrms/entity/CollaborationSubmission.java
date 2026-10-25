package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "collaboration_submissions", indexes = {
        @Index(name = "idx_collaboration_type_status", columnList = "submission_type,status"),
        @Index(name = "idx_collaboration_submitted_at", columnList = "submitted_at")
})
@Getter
@Setter
@NoArgsConstructor
public class CollaborationSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_type", nullable = false, length = 20)
    private CollaborationType type;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "organization_name", length = 180)
    private String organizationName;

    @Enumerated(EnumType.STRING)
    @Column(name = "organization_type", length = 24)
    private OrganizationType organizationType;

    @Column(name = "contact_person", length = 120)
    private String contactPerson;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(nullable = false, length = 180)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "area_of_interest", length = 30)
    private VolunteerInterest areaOfInterest;

    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CollaborationStatus status;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @PrePersist
    void onCreate() {
        submittedAt = LocalDateTime.now();
        if (status == null) status = CollaborationStatus.PENDING;
    }
}
