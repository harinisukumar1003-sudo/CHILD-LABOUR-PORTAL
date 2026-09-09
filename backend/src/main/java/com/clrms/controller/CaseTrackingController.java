package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.CaseTimelineEntryResponse;
import com.clrms.dto.DashboardStatusSummaryResponse;
import com.clrms.service.CaseTrackingService;
import com.clrms.service.DashboardStatusSummaryService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
public class CaseTrackingController {
    private final CaseTrackingService tracking;
    private final DashboardStatusSummaryService summary;

    public CaseTrackingController(CaseTrackingService tracking, DashboardStatusSummaryService summary) {
        this.tracking = tracking; this.summary = summary;
    }

    @GetMapping("/api/cases/{caseNumber}/timeline")
    @PreAuthorize("permitAll()")
    public ApiResponse<List<CaseTimelineEntryResponse>> timeline(@PathVariable String caseNumber, Authentication authentication) {
        return ApiResponse.success("Case timeline retrieved", tracking.timeline(caseNumber, authentication));
    }

    @GetMapping("/api/dashboard/status-summary")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<DashboardStatusSummaryResponse> statusSummary(Authentication authentication) {
        return ApiResponse.success("Status summary retrieved", summary.summarize(authentication));
    }
}