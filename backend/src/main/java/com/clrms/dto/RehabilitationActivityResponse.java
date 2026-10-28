package com.clrms.dto;

import com.clrms.entity.RehabilitationActivity;
import com.clrms.entity.RehabilitationActivityType;

import java.time.LocalDate;

public record RehabilitationActivityResponse(Long id, Long rehabilitationCaseId, RehabilitationActivityType activityType,
                                              String description, String providerName, LocalDate activityDate,
                                              String outcomeNotes, LocalDate nextFollowUpDate, Long recordedByUserId) {
    public static RehabilitationActivityResponse from(RehabilitationActivity activity) {
        return new RehabilitationActivityResponse(activity.getId(), activity.getRehabilitationCaseId(), activity.getActivityType(),
                activity.getDescription(), activity.getProviderName(), activity.getActivityDate(), activity.getOutcomeNotes(),
                activity.getNextFollowUpDate(), activity.getRecordedByUserId());
    }
}