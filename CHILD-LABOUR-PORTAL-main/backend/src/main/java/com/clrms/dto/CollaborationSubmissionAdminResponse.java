package com.clrms.dto;

import com.clrms.entity.CollaborationStatus;
import com.clrms.entity.CollaborationSubmission;
import com.clrms.entity.CollaborationType;
import com.clrms.entity.OrganizationType;
import com.clrms.entity.VolunteerInterest;

import java.time.LocalDateTime;

public record CollaborationSubmissionAdminResponse(
        Long id,
        CollaborationType type,
        String fullName,
        String organizationName,
        OrganizationType organizationType,
        String contactPerson,
        String email,
        String phone,
        String location,
        VolunteerInterest areaOfInterest,
        String skills,
        String message,
        CollaborationStatus status,
        LocalDateTime submittedAt
) {
    public static CollaborationSubmissionAdminResponse from(CollaborationSubmission submission) {
        return new CollaborationSubmissionAdminResponse(
                submission.getId(), submission.getType(), submission.getFullName(), submission.getOrganizationName(),
                submission.getOrganizationType(), submission.getContactPerson(), submission.getEmail(),
                submission.getPhone(), submission.getLocation(), submission.getAreaOfInterest(),
                submission.getSkills(), submission.getMessage(), submission.getStatus(), submission.getSubmittedAt());
    }
}
