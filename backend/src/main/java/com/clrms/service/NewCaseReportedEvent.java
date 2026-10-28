package com.clrms.service;

import org.springframework.context.ApplicationEvent;

public class NewCaseReportedEvent extends ApplicationEvent {
    private final Long caseId;
    private final String caseNumber;
    public NewCaseReportedEvent(Object source, Long caseId, String caseNumber) { super(source); this.caseId = caseId; this.caseNumber = caseNumber; }
    public Long getCaseId() { return caseId; }
    public String getCaseNumber() { return caseNumber; }
}