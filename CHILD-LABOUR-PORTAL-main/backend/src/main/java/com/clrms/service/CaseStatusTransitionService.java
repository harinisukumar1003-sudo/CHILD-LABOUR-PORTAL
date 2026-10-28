package com.clrms.service;

import com.clrms.entity.CaseStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CaseStatusTransitionService {
    private static final List<CaseStatus> REQUIRED_FLOW = List.of(
            CaseStatus.REPORTED,
            CaseStatus.UNDER_REVIEW,
            CaseStatus.ASSIGNED_TO_OFFICER,
            CaseStatus.INVESTIGATING,
            CaseStatus.INVESTIGATION_COMPLETED,
            CaseStatus.REHABILITATION_REFERRED,
            CaseStatus.REHABILITATION_ACCEPTED,
            CaseStatus.ADMITTED_TO_CENTRE,
            CaseStatus.IN_REHABILITATION,
            CaseStatus.REINTEGRATED,
            CaseStatus.CLOSED);

    private static final Map<CaseStatus, Set<CaseStatus>> TRANSITIONS = Map.ofEntries(
            Map.entry(CaseStatus.REPORTED, Set.of(CaseStatus.UNDER_REVIEW)),
            Map.entry(CaseStatus.UNDER_REVIEW, Set.of(CaseStatus.ASSIGNED_TO_OFFICER)),
            Map.entry(CaseStatus.ASSIGNED_TO_OFFICER, Set.of(CaseStatus.INVESTIGATING)),
            Map.entry(CaseStatus.INVESTIGATING, Set.of(CaseStatus.INVESTIGATION_COMPLETED)),
            Map.entry(CaseStatus.INVESTIGATION_COMPLETED, Set.of(CaseStatus.REHABILITATION_REFERRED)),
            Map.entry(CaseStatus.REHABILITATION_REFERRED, Set.of(CaseStatus.REHABILITATION_ACCEPTED)),
            Map.entry(CaseStatus.REHABILITATION_ACCEPTED, Set.of(CaseStatus.ADMITTED_TO_CENTRE)),
            Map.entry(CaseStatus.ADMITTED_TO_CENTRE, Set.of(CaseStatus.IN_REHABILITATION)),
            Map.entry(CaseStatus.IN_REHABILITATION, Set.of(CaseStatus.REINTEGRATED)),
            Map.entry(CaseStatus.REINTEGRATED, Set.of(CaseStatus.CLOSED)),
            Map.entry(CaseStatus.NGO_ASSIGNED, Set.of(CaseStatus.REHABILITATION_IN_PROGRESS)),
            Map.entry(CaseStatus.REHABILITATION_IN_PROGRESS, Set.of(CaseStatus.REHABILITATION_COMPLETED)),
            Map.entry(CaseStatus.REHABILITATION_COMPLETED, Set.of(CaseStatus.CLOSED)),
            Map.entry(CaseStatus.CLOSED, Set.of()),
            Map.entry(CaseStatus.INVALID_COMPLAINT, Set.of(CaseStatus.UNDER_REVIEW, CaseStatus.CLOSED, CaseStatus.REJECTED)),
            Map.entry(CaseStatus.REJECTED, Set.of()));

    public void validate(CaseStatus previous, CaseStatus next, String remarks) {
        validate(previous, next, remarks, false);
    }

    public void validate(CaseStatus previous, CaseStatus next, String remarks, boolean adminOverride) {
        if (previous == next) {
            return;
        }
        int previousFlowIndex = REQUIRED_FLOW.indexOf(previous);
        if (previousFlowIndex >= 0 && previousFlowIndex < REQUIRED_FLOW.size() - 1) {
            CaseStatus expected = REQUIRED_FLOW.get(previousFlowIndex + 1);
            if (next != expected) {
                if (adminOverride && remarks != null && !remarks.isBlank()) return;
                throw new IllegalArgumentException("The next required status after " + previous + " is " + expected
                        + ". Only an administrator may override the sequence with a reason.");
            }
        }
        if (!TRANSITIONS.getOrDefault(previous, Set.of()).contains(next)) {
            if (adminOverride && remarks != null && !remarks.isBlank()) return;
            throw new IllegalArgumentException("Invalid case status transition from " + previous + " to " + next
                    + ". Only an administrator may override the sequence with a reason.");
        }
        if (remarks == null || remarks.isBlank()) {
            throw new IllegalArgumentException(next == CaseStatus.REJECTED
                    ? "A rejection reason is required" : "Remarks are required for every status update");
        }
    }
}
