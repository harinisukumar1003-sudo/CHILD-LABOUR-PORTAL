package com.clrms.service;

import org.springframework.context.ApplicationEvent;

public class CaseReportCreatedEvent extends ApplicationEvent {
    private final Long reportId;
    private final String caseNumber;

    public CaseReportCreatedEvent(Object source, Long reportId, String caseNumber) {
        super(source);
        this.reportId = reportId;
        this.caseNumber = caseNumber;
    }

    public Long getReportId() { return reportId; }
    public String getCaseNumber() { return caseNumber; }
}