package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CaseRehabilitationReferralRequest(
        @NotNull Long ngoId,
        @NotBlank @Size(max = 4000) String note
) { }
