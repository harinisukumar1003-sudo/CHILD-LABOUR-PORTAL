package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.PrivacyRevealRequest;
import com.clrms.service.PrivacyAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PrivacyAuditController {
    private final PrivacyAuditService service;
    public PrivacyAuditController(PrivacyAuditService service) { this.service = service; }
    @PostMapping("/api/privacy/reveal")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<Void> reveal(@Valid @RequestBody PrivacyRevealRequest request, Authentication authentication, HttpServletRequest servletRequest) { service.logReveal(request, authentication, servletRequest.getRemoteAddr()); return ApiResponse.success("Sensitive access recorded", null); }
}