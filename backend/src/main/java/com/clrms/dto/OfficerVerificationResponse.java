package com.clrms.dto;

import com.clrms.entity.CaseOfficerVerification;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
public class OfficerVerificationResponse {
    private Long id;
    private Long caseReportId;
    private Long officerUserId;
    private LocalDate visitDate;
    private String outcome;
    private String observations;
    private String verificationResult;
    private Boolean childFound;
    private Boolean ageConfirmed;
    private Boolean workActivityObserved;
    private Boolean employerIdentified;
    private Boolean childInDanger;
    private Boolean guardianMet;
    private String photoUrl;
    private String actionTaken;
    private LocalDate followUpDate;
    private String remarks;
    private String declaration;
    private String recommendation;
    private Instant createdAt;

    public static OfficerVerificationResponse from(CaseOfficerVerification entity) {
        if (entity == null) return null;
        OfficerVerificationResponse res = new OfficerVerificationResponse();
        res.setId(entity.getId());
        res.setCaseReportId(entity.getCaseReportId());
        res.setOfficerUserId(entity.getOfficerUserId());
        res.setVisitDate(entity.getVisitDate());
        res.setOutcome(entity.getOutcome());
        res.setObservations(entity.getObservations());
        res.setVerificationResult(entity.getVerificationResult());
        res.setChildFound(entity.getChildFound());
        res.setAgeConfirmed(entity.getAgeConfirmed());
        res.setWorkActivityObserved(entity.getWorkActivityObserved());
        res.setEmployerIdentified(entity.getEmployerIdentified());
        res.setChildInDanger(entity.getChildInDanger());
        res.setGuardianMet(entity.getGuardianMet());
        res.setPhotoUrl(entity.getPhotoUrl());
        res.setActionTaken(entity.getActionTaken());
        res.setFollowUpDate(entity.getFollowUpDate());
        res.setRemarks(entity.getRemarks());
        res.setDeclaration(entity.getDeclaration());
        res.setRecommendation(entity.getRecommendation());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
