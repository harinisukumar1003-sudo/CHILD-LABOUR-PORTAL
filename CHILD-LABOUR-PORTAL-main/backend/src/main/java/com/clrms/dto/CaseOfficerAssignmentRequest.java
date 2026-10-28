package com.clrms.dto;

import jakarta.validation.constraints.NotNull;

public record CaseOfficerAssignmentRequest(@NotNull Long officerId) {
}
