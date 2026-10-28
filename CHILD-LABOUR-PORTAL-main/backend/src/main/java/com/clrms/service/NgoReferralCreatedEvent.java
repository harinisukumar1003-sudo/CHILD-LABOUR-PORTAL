package com.clrms.service;

import com.clrms.entity.UrgencyLevel;

import java.util.List;

public record NgoReferralCreatedEvent(
        Long caseId,
        String caseNumber,
        List<Long> recipientUserIds,
        UrgencyLevel urgency
) { }
