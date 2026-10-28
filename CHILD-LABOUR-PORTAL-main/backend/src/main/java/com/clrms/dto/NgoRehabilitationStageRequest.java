package com.clrms.dto;

import com.clrms.entity.CaseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record NgoRehabilitationStageRequest(
        @NotNull CaseStatus status,
        @NotBlank @Size(max = 4000) String progressNote,
        Long centerId,
        LocalDate admissionDate,
        @Size(max = 2000) String educationUpdate,
        @Size(max = 2000) String healthUpdate,
        @Size(max = 2000) String counsellingUpdate
) { }
