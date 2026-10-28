package com.clrms.dto;

import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;

import java.time.Instant;

public record CaseReportPublicResponse(String caseNumber, String district, UrgencyLevel urgencyLevel,
                                       CaseStatus status, Instant createdAt, Instant updatedAt) {
    public static CaseReportPublicResponse from(CaseReport report) {
        return new CaseReportPublicResponse(report.getCaseNumber(), report.getDistrict(), report.getUrgencyLevel(),
                report.getStatus(), report.getCreatedAt(), report.getUpdatedAt());
    }
}