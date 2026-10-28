package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.service.NgoCaseService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ngo")
public class NgoCaseController {
    private final NgoCaseService service;

    public NgoCaseController(NgoCaseService service) {
        this.service = service;
    }

    @GetMapping("/cases")
    @PreAuthorize("hasAnyRole('NGO_OFFICIAL', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<List<NgoCaseResponse>> myCases(Authentication authentication) {
        return ApiResponse.success("NGO rehabilitation cases retrieved", service.myCases(authentication));
    }

    @GetMapping("/referral-options")
    @PreAuthorize("hasAnyRole('OFFICER', 'ADMIN')")
    public ApiResponse<List<NgoReferralOptionResponse>> referralOptions(Authentication authentication) {
        return ApiResponse.success("Active referral destinations retrieved", service.referralOptions(authentication));
    }

    @PostMapping("/cases/{id}/accept")
    @PreAuthorize("hasAnyRole('NGO_OFFICIAL', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<NgoCaseResponse> accept(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.success("Rehabilitation referral accepted", service.accept(id, authentication));
    }

    @PostMapping("/cases/{id}/reject")
    @PreAuthorize("hasAnyRole('NGO_OFFICIAL', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<NgoCaseResponse> reject(@PathVariable Long id,
                                                @Valid @RequestBody NgoCaseRejectionRequest request,
                                                Authentication authentication) {
        return ApiResponse.success("Rehabilitation referral rejected", service.reject(id, request, authentication));
    }

    @PutMapping("/cases/{id}/stage")
    @PreAuthorize("hasAnyRole('NGO_OFFICIAL', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<NgoCaseResponse> advance(@PathVariable Long id,
                                                 @Valid @RequestBody NgoRehabilitationStageRequest request,
                                                 Authentication authentication) {
        return ApiResponse.success("Rehabilitation stage updated", service.advance(id, request, authentication));
    }

    @GetMapping("/cases/{id}/status-history")
    @PreAuthorize("hasAnyRole('NGO_OFFICIAL', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<List<CaseStatusHistoryResponse>> statusHistory(
            @PathVariable Long id, Authentication authentication) {
        return ApiResponse.success("Rehabilitation status history retrieved",
                service.statusHistory(id, authentication));
    }
}
