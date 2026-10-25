package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "officer_profiles", indexes = {
        @Index(name = "idx_officer_user", columnList = "user_id", unique = true),
        @Index(name = "idx_officer_state", columnList = "assigned_state")
})
@Getter @Setter @NoArgsConstructor
public class OfficerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "assigned_state", nullable = false, length = 120)
    private String assignedState;

    @Column(name = "badge_number", length = 64)
    private String badgeNumber;

    @Column(length = 160)
    private String department;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
