package com.clrms.dto;

import com.clrms.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequest(
        @NotBlank @Size(min = 2, max = 160) String name,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        UserRole role,
        @Size(max = 120) String district,
        @Size(max = 180) String organization,
        @Size(max = 120) String designation) { }
