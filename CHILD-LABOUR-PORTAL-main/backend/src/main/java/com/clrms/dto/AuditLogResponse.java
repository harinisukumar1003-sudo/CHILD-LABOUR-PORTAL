package com.clrms.dto;

import com.clrms.entity.AuditLog;

import java.time.Instant;

public record AuditLogResponse(Long id, Long adminUserId, String action, String targetEntity, Long targetId, Instant timestamp, String ipAddress) {
    public static AuditLogResponse from(AuditLog log) { return new AuditLogResponse(log.getId(), log.getAdminUserId(), log.getAction(), log.getTargetEntity(), log.getTargetId(), log.getTimestamp(), log.getIpAddress()); }
}