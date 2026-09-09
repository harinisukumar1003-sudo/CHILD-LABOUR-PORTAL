package com.clrms.service;

import com.clrms.entity.CaseStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class CaseStatusTransitionService {
    private static final Map<CaseStatus, Set<CaseStatus>> TRANSITIONS = Map.of(
            CaseStatus.REPORTED, Set.of(CaseStatus.UNDER_REVIEW),
            CaseStatus.UNDER_REVIEW, Set.of(CaseStatus.ASSIGNED, CaseStatus.REJECTED),
            CaseStatus.ASSIGNED, Set.of(CaseStatus.INVESTIGATING),
            CaseStatus.INVESTIGATING, Set.of(CaseStatus.RESCUED, CaseStatus.REJECTED),
            CaseStatus.RESCUED, Set.of(CaseStatus.REHABILITATION),
            CaseStatus.REHABILITATION, Set.of(CaseStatus.CLOSED),
            CaseStatus.CLOSED, Set.of(),
            CaseStatus.REJECTED, Set.of());

    public void validate(CaseStatus previous, CaseStatus next, String remarks) {
        if (previous == next || !TRANSITIONS.getOrDefault(previous, Set.of()).contains(next)) {
            throw new IllegalArgumentException("Invalid case status transition from " + previous + " to " + next);
        }
        if (remarks == null || remarks.isBlank()) {
            throw new IllegalArgumentException(next == CaseStatus.REJECTED
                    ? "A rejection reason is required" : "Remarks are required for every status update");
        }
    }
}