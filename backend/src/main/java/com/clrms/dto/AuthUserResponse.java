package com.clrms.dto;

import com.clrms.entity.User;
import com.clrms.entity.UserRole;

public record AuthUserResponse(Long id, String name, String email, UserRole role, String district) {
    public static AuthUserResponse from(User user) {
        return new AuthUserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getDistrict());
    }
}
