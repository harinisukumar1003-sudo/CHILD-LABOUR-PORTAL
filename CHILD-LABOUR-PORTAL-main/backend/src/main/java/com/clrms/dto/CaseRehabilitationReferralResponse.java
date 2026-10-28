package com.clrms.dto;

import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;

import java.time.Instant;

public record CaseRehabilitationReferralResponse(
        Long caseId,
        CaseStatus status,
        Long ngoId,
        String ngoName,
        Instant referredAt
) {
    public static CaseRehabilitationReferralResponse from(CaseReport report, String ngoName) {
        return new CaseRehabilitationReferralResponse(report.getId(), report.getStatus(),
                report.getAssignedNgoId(), ngoName, report.getReferredAt());
    }
}
