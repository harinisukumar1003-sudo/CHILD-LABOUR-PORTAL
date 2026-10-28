package com.clrms.repository;

import com.clrms.entity.Notification;
import com.clrms.entity.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);
    long countByRecipientUserIdAndIsReadFalse(Long recipientUserId);
    boolean existsByRecipientUserIdAndTypeAndRelatedCaseIdAndCreatedAtBetween(Long recipientUserId, NotificationType type, Long relatedCaseId, Instant from, Instant to);
    @Modifying
    @Query("update Notification n set n.isRead = true where n.recipientUserId = :recipientId and n.isRead = false")
    int markAllRead(@Param("recipientId") Long recipientId);
}