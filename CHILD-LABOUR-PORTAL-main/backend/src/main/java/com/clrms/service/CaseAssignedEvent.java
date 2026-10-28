package com.clrms.service;

import com.clrms.entity.UrgencyLevel;
import org.springframework.context.ApplicationEvent;

public class CaseAssignedEvent extends ApplicationEvent {
    private final Long caseId; private final String caseNumber; private final Long assignedOfficerId; private final Long assignedByAdminId; private final UrgencyLevel urgency; private final Long previousOfficerId;
    public CaseAssignedEvent(Object source, Long caseId, String caseNumber, Long assignedOfficerId, Long assignedByAdminId, UrgencyLevel urgency) {
        this(source, caseId, caseNumber, assignedOfficerId, assignedByAdminId, urgency, null);
    }
    public CaseAssignedEvent(Object source, Long caseId, String caseNumber, Long assignedOfficerId, Long assignedByAdminId, UrgencyLevel urgency, Long previousOfficerId) {
        super(source); this.caseId = caseId; this.caseNumber = caseNumber; this.assignedOfficerId = assignedOfficerId; this.assignedByAdminId = assignedByAdminId; this.urgency = urgency; this.previousOfficerId = previousOfficerId;
    }
    public Long getCaseId() { return caseId; } public String getCaseNumber() { return caseNumber; } public Long getAssignedOfficerId() { return assignedOfficerId; } public Long getAssignedByAdminId() { return assignedByAdminId; } public UrgencyLevel getUrgency() { return urgency; } public Long getPreviousOfficerId() { return previousOfficerId; }
}