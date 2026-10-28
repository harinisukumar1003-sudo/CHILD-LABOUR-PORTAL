package com.clrms.dto;

import com.clrms.entity.CollaborationStatus;
import jakarta.validation.constraints.NotNull;

public record CollaborationStatusUpdateRequest(
        @NotNull(message = "Status is required") CollaborationStatus status
) {}
