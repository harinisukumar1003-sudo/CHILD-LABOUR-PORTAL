package com.clrms.dto;

import com.clrms.entity.RehabilitationCase;
import com.clrms.entity.RehabilitationPhase;

import java.time.LocalDate;

public record RehabilitationCaseResponse(Long id, Long caseReportId, String childAlias, Long rehabilitationCenterId,
                                         LocalDate startDate, RehabilitationPhase currentPhase, Long assignedCounsellorId) {
    public static RehabilitationCaseResponse from(RehabilitationCase rehab) {
        return new RehabilitationCaseResponse(rehab.getId(), rehab.getCaseReportId(), rehab.getChildAlias(), rehab.getRehabilitationCenterId(),
                rehab.getStartDate(), rehab.getCurrentPhase(), rehab.getAssignedCounsellorId());
    }
}