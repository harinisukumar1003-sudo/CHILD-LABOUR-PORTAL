package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.service.DashboardSummaryService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardSummaryController {
    private final DashboardSummaryService service;

    public DashboardSummaryController(DashboardSummaryService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(Authentication authentication) {
        return ApiResponse.success("Dashboard summary retrieved", service.summarize(authentication));
    }
}
