package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import com.clrms.service.CaseManagementService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cases")
public class CaseManagementController {
    private final CaseManagementService service;

    public CaseManagementController(CaseManagementService service) { this.service = service; }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CaseAssignmentResponse> assign(@PathVariable Long id, @Valid @RequestBody CaseAssignmentRequest request, Authentication authentication) { return ApiResponse.success("Case assigned", service.assign(id, request, authentication)); }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<CaseInvestigationLogResponse> status(@PathVariable Long id, @Valid @RequestBody CaseStatusUpdateRequest request, Authentication authentication) { return ApiResponse.success("Case status updated", service.updateStatus(id, request, authentication)); }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<List<CaseInvestigationLogResponse>> history(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Case history retrieved", service.history(id, authentication)); }

    @GetMapping("/assigned-to-me")
    @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<List<CaseReportResponse>> assignedToMe(Authentication authentication) { return ApiResponse.success("Assigned cases retrieved", service.assignedToMe(authentication)); }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<CaseInvestigationLogResponse> note(@PathVariable Long id, @Valid @RequestBody CaseNoteRequest request, Authentication authentication) { return ApiResponse.success("Investigation note added", service.addNote(id, request.getRemarks(), request.getAttachmentUrl(), authentication)); }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<List<CaseReportResponse>> search(@RequestParam(required = false) CaseStatus status, @RequestParam(required = false) UrgencyLevel urgency,
                                                        @RequestParam(required = false) String district, @RequestParam(required = false) LocalDate from,
                                                        @RequestParam(required = false) LocalDate to, @RequestParam(required = false) Long assignedOfficerId,
                                                        @RequestParam(required = false) String keyword, Authentication authentication) {
        return ApiResponse.success("Cases retrieved", service.search(status, urgency, district, from, to, assignedOfficerId, keyword, authentication));
    }
}