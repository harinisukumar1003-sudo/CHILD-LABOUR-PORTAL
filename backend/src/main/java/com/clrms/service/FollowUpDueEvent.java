package com.clrms.service;

import java.time.LocalDate;
import org.springframework.context.ApplicationEvent;

public class FollowUpDueEvent extends ApplicationEvent {
    private final Long activityId; private final Long rehabilitationCaseId; private final Long recipientUserId; private final LocalDate followUpDate;
    public FollowUpDueEvent(Object source, Long activityId, Long rehabilitationCaseId, Long recipientUserId, LocalDate followUpDate) { super(source); this.activityId = activityId; this.rehabilitationCaseId = rehabilitationCaseId; this.recipientUserId = recipientUserId; this.followUpDate = followUpDate; }
    public Long getActivityId() { return activityId; } public Long getRehabilitationCaseId() { return rehabilitationCaseId; } public Long getRecipientUserId() { return recipientUserId; } public LocalDate getFollowUpDate() { return followUpDate; }
}