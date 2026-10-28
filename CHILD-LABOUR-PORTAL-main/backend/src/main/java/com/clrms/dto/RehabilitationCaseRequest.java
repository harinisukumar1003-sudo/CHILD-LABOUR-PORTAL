package com.clrms.dto;

import com.clrms.entity.RehabilitationPhase;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
public class RehabilitationCaseRequest {
    @NotNull private Long caseReportId;
    @NotBlank private String childAlias;
    @NotNull private Long rehabilitationCenterId;
    @NotNull private LocalDate startDate;
    @NotNull private RehabilitationPhase currentPhase;
    @NotNull private Long assignedCounsellorId;
}