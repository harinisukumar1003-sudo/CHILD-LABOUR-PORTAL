package com.clrms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_recipient_created", columnList = "recipient_user_id,created_at"),
        @Index(name = "idx_notification_unread", columnList = "recipient_user_id,is_read")
})
@Getter @Setter @NoArgsConstructor
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private NotificationType type;
    @Column(nullable = false, length = 180)
    private String title;
    @Column(nullable = false, length = 1000)
    private String message;
    private Long relatedCaseId;
    @Column(name = "is_read", nullable = false)
    private boolean isRead;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}