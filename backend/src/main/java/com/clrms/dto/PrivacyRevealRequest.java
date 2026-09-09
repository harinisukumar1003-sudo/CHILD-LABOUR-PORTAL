package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class PrivacyRevealRequest {
    @NotNull private Long caseId;
    @NotBlank private String field;
}