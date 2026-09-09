package com.clrms.dto;

import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.EvidenceFileType;
import com.clrms.entity.UrgencyLevel;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CaseReportResponse(Long id, String caseNumber, Long reporterId, String childName,
                                 Integer approxAge, String gender, String childDescription,
                                 String locationAddress, Double latitude, Double longitude,
                                 String district, String state, String incidentDescription,
                                 String employerOrLocationDetails, LocalDate dateOfIncident,
                                 boolean anonymous, String trackingCode, UrgencyLevel urgencyLevel,
                                 CaseStatus status, Instant createdAt, Instant updatedAt,
                                 List<EvidenceResponse> evidence) {
    public static CaseReportResponse from(CaseReport report, boolean includeTrackingCode) {
        return new CaseReportResponse(report.getId(), report.getCaseNumber(), report.getReporterId(),
                report.getChildName(), report.getApproxAge(), report.getGender(), report.getChildDescription(),
                report.getLocationAddress(), report.getLatitude(), report.getLongitude(), report.getDistrict(),
                report.getState(), report.getIncidentDescription(), report.getEmployerOrLocationDetails(),
                report.getDateOfIncident(), report.isAnonymous(), includeTrackingCode ? report.getTrackingCode() : null,
                report.getUrgencyLevel(), report.getStatus(), report.getCreatedAt(), report.getUpdatedAt(),
                report.getEvidence().stream().map(EvidenceResponse::from).toList());
    }

    public static CaseReportResponse forNgo(CaseReport report) {
        CaseReportResponse response = from(report, false);
        return new CaseReportResponse(response.id(), response.caseNumber(), null, null, response.approxAge(), response.gender(),
                response.childDescription(), response.locationAddress(), response.latitude(), response.longitude(), response.district(), response.state(),
                response.incidentDescription(), response.employerOrLocationDetails(), response.dateOfIncident(), response.anonymous(), null,
                response.urgencyLevel(), response.status(), response.createdAt(), response.updatedAt(), response.evidence());
    }

    public record EvidenceResponse(Long id, String fileUrl, EvidenceFileType fileType, Instant uploadedAt, Long uploadedBy) {
        static EvidenceResponse from(com.clrms.entity.CaseEvidence evidence) {
            return new EvidenceResponse(evidence.getId(), evidence.getFileUrl(), evidence.getFileType(), evidence.getUploadedAt(), evidence.getUploadedBy());
        }
    }
}