package com.clrms.dto;

import com.clrms.entity.CaseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter @Setter
public class CaseStatusUpdateRequest {
    @NotNull
    private CaseStatus status;
    @NotBlank
    private String remarks;
    private String attachmentUrl;
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
    private String actionTaken;
    private LocalDate followUpDate;
    private String declaration;
}
