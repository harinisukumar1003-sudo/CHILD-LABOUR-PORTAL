package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManualVerificationResetRequest(
        @NotBlank @Size(max = 1000) String reason
) { }
