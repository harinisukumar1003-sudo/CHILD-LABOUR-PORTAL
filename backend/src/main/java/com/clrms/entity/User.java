package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_role_status", columnList = "role,status"),
        @Index(name = "idx_user_district", columnList = "district")
})
@Getter @Setter @NoArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(nullable = false, unique = true, length = 180)
    private String email;
    @Column(length = 100)
    private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private UserRole role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private UserStatus status;
    @Column(length = 120)
    private String state;
    @Column(length = 120)
    private String district;
    @Column(length = 180)
    private String organization;
    @Column(name = "ngo_organization_id")
    private Long ngoOrganizationId;
    @Column(length = 120)
    private String designation;
    @Column(length = 64)
    private String passwordResetTokenHash;
    private Instant passwordResetExpiresAt;
    @Column(name = "is_demo_account", nullable = false)
    private boolean isDemoAccount = false;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}