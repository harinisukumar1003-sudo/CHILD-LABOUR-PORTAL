package com.clrms.dto;

import com.clrms.entity.UrgencyLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter @Setter
public class CaseReportRequest {
    private String childName;
    @Min(0) @Max(18)
    private Integer approxAge;
    private String gender;
    private String childDescription;
    @NotBlank
    private String locationAddress;
    private Double latitude;
    private Double longitude;
    private String district;
    private String state;
    @NotBlank
    private String incidentDescription;
    private String employerOrLocationDetails;
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateOfIncident;
    private boolean anonymous;
    private UrgencyLevel urgencyLevel = UrgencyLevel.MEDIUM;
}