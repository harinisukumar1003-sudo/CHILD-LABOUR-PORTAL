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
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private UserRole role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private UserStatus status;
    @Column(length = 120)
    private String district;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}