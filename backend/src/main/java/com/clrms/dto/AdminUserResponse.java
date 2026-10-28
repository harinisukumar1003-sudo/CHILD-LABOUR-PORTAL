package com.clrms.dto;

import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;

import java.time.Instant;

public record AdminUserResponse(Long id, String name, String email, UserRole role, UserStatus status, String district, Instant createdAt) {
    public static AdminUserResponse from(User user) { return new AdminUserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getStatus(), user.getDistrict(), user.getCreatedAt()); }
}