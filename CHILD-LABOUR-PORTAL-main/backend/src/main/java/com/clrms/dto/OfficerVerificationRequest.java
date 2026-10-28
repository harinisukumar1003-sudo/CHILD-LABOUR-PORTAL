package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class OfficerVerificationRequest {
    @NotNull(message = "Visit date is required")
    private LocalDate visitDate;

    private String outcome;

    @NotBlank(message = "Detailed observations are required")
    private String observations;

    @NotBlank(message = "Verification result is required")
    private String verificationResult;

    @NotNull(message = "Child found status must be specified")
    private Boolean childFound;

    @NotNull(message = "Age confirmation status must be specified")
    private Boolean ageConfirmed;

    @NotNull(message = "Work activity status must be specified")
    private Boolean workActivityObserved;

    @NotNull(message = "Employer identification status must be specified")
    private Boolean employerIdentified;

    @NotNull(message = "Child in danger assessment must be specified")
    private Boolean childInDanger;

    @NotNull(message = "Guardian contact status must be specified")
    private Boolean guardianMet;

    private String photoUrl;

    @NotBlank(message = "Action taken is required")
    private String actionTaken;

    private LocalDate followUpDate;

    private String remarks;

    @NotBlank(message = "Declaration 'I personally visited' is mandatory")
    private String declaration;

    private String recommendation;
}
