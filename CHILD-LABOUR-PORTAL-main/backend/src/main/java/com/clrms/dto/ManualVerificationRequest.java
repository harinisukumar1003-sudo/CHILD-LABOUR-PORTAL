package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ManualVerificationRequest(
        @NotEmpty Map<String, Boolean> checklist,
        @NotBlank @Size(max = 4000) String notes
) { }
