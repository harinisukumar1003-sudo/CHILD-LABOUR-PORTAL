package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_admin_timestamp", columnList = "admin_user_id,timestamp")
})
@Getter @Setter @NoArgsConstructor
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "admin_user_id")
    private Long adminUserId;
    @Column(columnDefinition = "TEXT")
    private String beforeState;
    @Column(columnDefinition = "TEXT")
    private String afterState;
    @Column(nullable = false, length = 100)
    private String action;
    @Column(nullable = false, length = 80)
    private String targetEntity;
    private Long targetId;
    @Column(nullable = false)
    private Instant timestamp;
    @Column(length = 64)
    private String ipAddress;

    @PrePersist
    void onCreate() { timestamp = Instant.now(); }
}