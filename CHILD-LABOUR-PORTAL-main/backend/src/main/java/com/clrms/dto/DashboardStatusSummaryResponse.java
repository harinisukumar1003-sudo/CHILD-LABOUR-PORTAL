package com.clrms.dto;

import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;

import java.util.Map;

public record DashboardStatusSummaryResponse(Map<CaseStatus, Long> byStatus,
                                             Map<String, Long> byDistrict,
                                             Map<UrgencyLevel, Long> byUrgency) { }