package com.clrms.dto;

public record DemoAccountResponse(
        Long id,
        String displayName,
        String role,
        String state,
        String organization,
        String email
) { }
