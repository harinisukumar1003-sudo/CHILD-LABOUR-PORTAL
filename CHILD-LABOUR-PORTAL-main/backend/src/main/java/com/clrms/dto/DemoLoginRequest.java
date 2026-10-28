package com.clrms.dto;

import jakarta.validation.constraints.NotNull;

public record DemoLoginRequest(
        @NotNull(message = "userId must not be null")
        Long userId
) { }
