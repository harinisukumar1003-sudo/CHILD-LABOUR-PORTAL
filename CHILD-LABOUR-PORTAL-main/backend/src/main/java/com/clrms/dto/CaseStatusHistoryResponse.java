package com.clrms.dto;

import com.clrms.entity.CaseStatus;

import java.time.Instant;
import java.time.LocalDate;

public record CaseStatusHistoryResponse(
        Long id,
        CaseStatus previousStatus,
        CaseStatus newStatus,
        Long actorUserId,
        String actorName,
        String actorRole,
        Instant createdAt,
        String details,
        String progressNote,
        Long centerId,
        LocalDate admissionDate,
        String educationUpdate,
        String healthUpdate,
        String counsellingUpdate
) { }
