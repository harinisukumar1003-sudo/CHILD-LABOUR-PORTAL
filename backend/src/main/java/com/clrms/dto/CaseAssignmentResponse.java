package com.clrms.dto;

import com.clrms.entity.CaseAssignment;

import java.time.Instant;

public record CaseAssignmentResponse(Long id, Long caseReportId, Long assignedOfficerId, Long assignedByAdminId,
                                     Instant assignedAt, String jurisdiction, String notes) {
    public static CaseAssignmentResponse from(CaseAssignment assignment) {
        return new CaseAssignmentResponse(assignment.getId(), assignment.getCaseReportId(), assignment.getAssignedOfficerId(),
                assignment.getAssignedByAdminId(), assignment.getAssignedAt(), assignment.getJurisdiction(), assignment.getNotes());
    }
}