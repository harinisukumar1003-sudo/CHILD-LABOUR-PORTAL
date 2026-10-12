package com.clrms.dto;

import com.clrms.entity.UrgencyLevel;
import com.clrms.validation.ValidCaseReportSubmission;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Getter @Setter
@ValidCaseReportSubmission
public class CaseReportRequest {
    @Size(max = 160)
    private String reporterName;
    @Size(max = 254)
    @Email
    private String reporterEmail;
    @Size(max = 30)
    private String reporterPhone;

    @Size(max = 160)
    @Size(max = 160)
    private String childName;
    @NotNull(message = "Approximate age is required")
    @Min(0) @Max(18)
    private Integer approxAge;
    @NotBlank(message = "Gender is required")
    @Size(max = 80)
    private String gender;
    @NotBlank(message = "Child description is required")
    @Size(min = 20, max = 2000, message = "Child description must be at least 20 characters")
    private String childDescription;
    @NotBlank(message = "Location address is required")
    @Size(max = 2000)
    private String locationAddress;
    private Double latitude;
    private Double longitude;
    @NotBlank(message = "District is required")
    @Size(max = 120)
    private String district;
    @NotBlank(message = "State is required")
    @Size(max = 120)
    private String state;
    @NotBlank(message = "Incident description is required")
    @Size(min = 30, max = 4000, message = "Incident description must be at least 30 characters")
    private String incidentDescription;
    @Size(max = 2000)
    private String employerOrLocationDetails;
    @NotNull(message = "Date of incident is required")
    @Past(message = "Date of incident must be in the past")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateOfIncident;
    private boolean anonymous;
    @NotNull(message = "Urgency level is required")
    private UrgencyLevel urgencyLevel;
    private List<MultipartFile> files;
}