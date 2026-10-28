package com.clrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CaseNgoAssignmentRequest {
    @NotNull(message = "Assigned NGO user ID is required")
    private Long assignedNgoUserId;
    private String notes;
}
