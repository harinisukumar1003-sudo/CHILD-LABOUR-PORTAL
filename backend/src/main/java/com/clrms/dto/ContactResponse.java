package com.clrms.dto;

import java.time.LocalDateTime;

public record ContactResponse(
    String message,
    String email,
    LocalDateTime submittedAt,
    String status
) {}
