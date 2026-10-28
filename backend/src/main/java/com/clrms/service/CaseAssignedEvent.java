package com.clrms.service;

import com.clrms.entity.UrgencyLevel;
import org.springframework.context.ApplicationEvent;

public class CaseAssignedEvent extends ApplicationEvent {
    private final Long caseId; private final String caseNumber; private final Long assignedOfficerId; private final Long assignedByAdminId; private final UrgencyLevel urgency;
    public CaseAssignedEvent(Object source, Long caseId, String caseNumber, Long assignedOfficerId, Long assignedByAdminId, UrgencyLevel urgency) { super(source); this.caseId = caseId; this.caseNumber = caseNumber; this.assignedOfficerId = assignedOfficerId; this.assignedByAdminId = assignedByAdminId; this.urgency = urgency; }
    public Long getCaseId() { return caseId; } public String getCaseNumber() { return caseNumber; } public Long getAssignedOfficerId() { return assignedOfficerId; } public Long getAssignedByAdminId() { return assignedByAdminId; } public UrgencyLevel getUrgency() { return urgency; }
}