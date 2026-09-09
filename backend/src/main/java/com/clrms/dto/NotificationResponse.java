package com.clrms.dto;

import com.clrms.entity.Notification;
import com.clrms.entity.NotificationType;

import java.time.Instant;

public record NotificationResponse(Long id, Long recipientUserId, NotificationType type, String title, String message,
                                   Long relatedCaseId, boolean isRead, Instant createdAt) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getRecipientUserId(), notification.getType(),
                notification.getTitle(), notification.getMessage(), notification.getRelatedCaseId(), notification.isRead(), notification.getCreatedAt());
    }
}