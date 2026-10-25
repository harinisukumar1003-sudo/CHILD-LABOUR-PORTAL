package com.clrms.service;

import com.clrms.entity.CaseStatus;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class CaseStatusTransitionService {
    private static final Map<CaseStatus, Set<CaseStatus>> TRANSITIONS = Map.ofEntries(
            Map.entry(CaseStatus.REPORTED, Set.of(CaseStatus.UNDER_REVIEW, CaseStatus.ASSIGNED_TO_OFFICER, CaseStatus.REJECTED)),
            Map.entry(CaseStatus.UNDER_REVIEW, Set.of(CaseStatus.ASSIGNED_TO_OFFICER, CaseStatus.REJECTED)),
            Map.entry(CaseStatus.ASSIGNED_TO_OFFICER, Set.of(CaseStatus.INVESTIGATING, CaseStatus.ASSIGNED_TO_OFFICER, CaseStatus.REJECTED)),
            Map.entry(CaseStatus.INVESTIGATING, Set.of(CaseStatus.INVESTIGATION_COMPLETED, CaseStatus.REHABILITATION_REFERRED, CaseStatus.INVALID_COMPLAINT)),
            Map.entry(CaseStatus.INVESTIGATION_COMPLETED, Set.of(CaseStatus.REHABILITATION_REFERRED, CaseStatus.CLOSED)),
            Map.entry(CaseStatus.REHABILITATION_REFERRED, Set.of(CaseStatus.NGO_ASSIGNED)),
            Map.entry(CaseStatus.NGO_ASSIGNED, Set.of(CaseStatus.REHABILITATION_IN_PROGRESS)),
            Map.entry(CaseStatus.REHABILITATION_IN_PROGRESS, Set.of(CaseStatus.REHABILITATION_COMPLETED)),
            Map.entry(CaseStatus.REHABILITATION_COMPLETED, Set.of(CaseStatus.CLOSED)),
            Map.entry(CaseStatus.CLOSED, Set.of()),
            Map.entry(CaseStatus.INVALID_COMPLAINT, Set.of(CaseStatus.UNDER_REVIEW, CaseStatus.CLOSED, CaseStatus.REJECTED)),
            Map.entry(CaseStatus.REJECTED, Set.of()));

    public void validate(CaseStatus previous, CaseStatus next, String remarks) {
        if (previous == next) {
            return;
        }
        if (!TRANSITIONS.getOrDefault(previous, Set.of()).contains(next)) {
            throw new IllegalArgumentException("Invalid case status transition from " + previous + " to " + next);
        }
        if (remarks == null || remarks.isBlank()) {
            throw new IllegalArgumentException(next == CaseStatus.REJECTED
                    ? "A rejection reason is required" : "Remarks are required for every status update");
        }
    }
}
