package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.service.DashboardSummaryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class RoleDashboardController {
    private final DashboardSummaryService service;
    public RoleDashboardController(DashboardSummaryService service) { this.service = service; }

    @GetMapping("/admin/dashboard") @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Object>> admin(Authentication authentication) { return ApiResponse.success("Admin dashboard retrieved", service.summarize(authentication)); }

    @GetMapping("/officer/dashboard") @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<Map<String, Object>> officer(Authentication authentication) { return ApiResponse.success("Officer dashboard retrieved", service.summarize(authentication)); }

    @GetMapping("/ngo/dashboard") @PreAuthorize("hasAnyRole('NGO_STAFF', 'NGO_OFFICIAL')")
    public ApiResponse<Map<String, Object>> ngo(Authentication authentication) { return ApiResponse.success("NGO dashboard retrieved", service.summarize(authentication)); }
}
