package com.clrms.dto;

import com.clrms.entity.CaseInvestigationLog;
import com.clrms.entity.CaseStatus;

import java.time.Instant;

public record CaseInvestigationLogResponse(Long id, Long caseReportId, Long updatedByUserId,
                                            CaseStatus previousStatus, CaseStatus newStatus,
                                            String remarks, String attachmentUrl, Instant createdAt) {
    public static CaseInvestigationLogResponse from(CaseInvestigationLog log) {
        return new CaseInvestigationLogResponse(log.getId(), log.getCaseReportId(), log.getUpdatedByUserId(),
                log.getPreviousStatus(), log.getNewStatus(), log.getRemarks(), log.getAttachmentUrl(), log.getCreatedAt());
    }
}