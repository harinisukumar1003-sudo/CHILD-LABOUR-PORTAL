package com.clrms.dto;

import com.clrms.entity.CollaborationStatus;
import com.clrms.entity.CollaborationSubmission;
import com.clrms.entity.CollaborationType;

import java.time.LocalDateTime;

public record CollaborationSubmissionResponse(
        Long id,
        CollaborationType type,
        CollaborationStatus status,
        LocalDateTime submittedAt
) {
    public static CollaborationSubmissionResponse from(CollaborationSubmission submission) {
        return new CollaborationSubmissionResponse(
                submission.getId(), submission.getType(), submission.getStatus(), submission.getSubmittedAt());
    }
}
