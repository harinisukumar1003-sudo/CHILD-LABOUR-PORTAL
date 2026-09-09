package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CaseAssignmentRequest {
    @NotNull
    private Long assignedOfficerId;
    @NotBlank
    private String jurisdiction;
    private String notes;
}