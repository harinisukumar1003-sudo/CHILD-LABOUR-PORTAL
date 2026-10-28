package com.clrms.service;

import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import org.springframework.context.ApplicationEvent;

public class CaseStatusChangedEvent extends ApplicationEvent {
    private final Long caseId; private final String caseNumber; private final CaseStatus previousStatus; private final CaseStatus newStatus; private final Long actorId; private final Long recipientUserId; private final UrgencyLevel urgency; private final String remarks;
    public CaseStatusChangedEvent(Object source, Long caseId, String caseNumber, CaseStatus previousStatus, CaseStatus newStatus, Long actorId, Long recipientUserId, UrgencyLevel urgency, String remarks) { super(source); this.caseId = caseId; this.caseNumber = caseNumber; this.previousStatus = previousStatus; this.newStatus = newStatus; this.actorId = actorId; this.recipientUserId = recipientUserId; this.urgency = urgency; this.remarks = remarks; }
    public Long getCaseId() { return caseId; } public String getCaseNumber() { return caseNumber; } public CaseStatus getPreviousStatus() { return previousStatus; } public CaseStatus getNewStatus() { return newStatus; } public Long getActorId() { return actorId; } public Long getRecipientUserId() { return recipientUserId; } public UrgencyLevel getUrgency() { return urgency; } public String getRemarks() { return remarks; }
}