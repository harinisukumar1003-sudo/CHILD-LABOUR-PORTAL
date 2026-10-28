package com.clrms.dto;

import com.clrms.entity.CaseInvestigationLog;
import com.clrms.entity.CaseStatus;

import java.time.Instant;
import java.time.LocalDate;

public record CaseInvestigationLogResponse(Long id, Long caseReportId, Long updatedByUserId,
                                            CaseStatus previousStatus, CaseStatus newStatus,
                                            String remarks, String attachmentUrl, Instant createdAt, LocalDate visitDate,
                                            String outcome, String observations, String verificationResult, Boolean childFound,
                                            Boolean ageConfirmed, Boolean workActivityObserved, Boolean employerIdentified,
                                            Boolean childInDanger, Boolean guardianMet, String actionTaken, LocalDate followUpDate,
                                            String declaration) {
    public static CaseInvestigationLogResponse from(CaseInvestigationLog log) {
        return new CaseInvestigationLogResponse(log.getId(), log.getCaseReportId(), log.getUpdatedByUserId(),
                log.getPreviousStatus(), log.getNewStatus(), log.getRemarks(), log.getAttachmentUrl(), log.getCreatedAt(),
                log.getVisitDate(), log.getOutcome(), log.getObservations(), log.getVerificationResult(), log.getChildFound(),
                log.getAgeConfirmed(), log.getWorkActivityObserved(), log.getEmployerIdentified(), log.getChildInDanger(),
                log.getGuardianMet(), log.getActionTaken(), log.getFollowUpDate(), log.getDeclaration());
    }
}
