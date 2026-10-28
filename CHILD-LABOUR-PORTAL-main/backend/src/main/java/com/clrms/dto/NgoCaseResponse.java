package com.clrms.dto;

import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;

import java.time.Instant;

public record NgoCaseResponse(
        Long id,
        String caseNumber,
        CaseStatus status,
        UrgencyLevel urgencyLevel,
        String district,
        String state,
        Long assignedNgoId,
        String ngoName,
        Instant referredAt,
        String referralNote,
        Long acceptedBy,
        Instant acceptedAt
) {
    public static NgoCaseResponse from(CaseReport report, String ngoName) {
        return new NgoCaseResponse(report.getId(), report.getCaseNumber(), report.getStatus(),
                report.getUrgencyLevel(), report.getDistrict(), report.getState(),
                report.getAssignedNgoId(), ngoName, report.getReferredAt(), report.getReferralNote(),
                report.getRehabilitationAcceptedBy(), report.getRehabilitationAcceptedAt());
    }
}
