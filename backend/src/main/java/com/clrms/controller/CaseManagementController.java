package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import com.clrms.service.CaseManagementService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cases")
public class CaseManagementController {
    private final CaseManagementService service;

    public CaseManagementController(CaseManagementService service) { this.service = service; }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CaseAssignmentResponse> assign(@PathVariable Long id, @Valid @RequestBody CaseAssignmentRequest request, Authentication authentication) {
        return ApiResponse.success("Case assigned", service.assign(id, request, authentication));
    }

    @PostMapping("/{id}/assign-ngo")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CaseReportResponse> assignNgo(@PathVariable Long id, @Valid @RequestBody CaseNgoAssignmentRequest request, Authentication authentication) {
        return ApiResponse.success("Case assigned to NGO", service.assignNgo(id, request.getAssignedNgoUserId(), request.getNotes(), authentication));
    }

    @PostMapping("/{id}/verification")
    @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<OfficerVerificationResponse> submitVerification(@PathVariable Long id, @Valid @RequestBody OfficerVerificationRequest request, Authentication authentication) {
        return ApiResponse.success("In-person verification recorded", service.submitVerification(id, request, authentication));
    }

    @GetMapping("/{id}/verification")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN')")
    public ApiResponse<OfficerVerificationResponse> getVerification(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.success("Verification details retrieved", service.getVerification(id, authentication));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN')")
    public ApiResponse<CaseInvestigationLogResponse> status(@PathVariable Long id, @Valid @RequestBody CaseStatusUpdateRequest request, Authentication authentication) {
        return ApiResponse.success("Case status updated", service.updateStatus(id, request, authentication));
    }

    @PostMapping(path = "/{id}/evidence/photos", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<CaseReportResponse.EvidenceResponse> visitPhoto(@PathVariable Long id, @RequestPart("file") MultipartFile file, Authentication authentication) {
        return ApiResponse.success("Visit photo uploaded", service.uploadVisitPhoto(id, file, authentication));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN')")
    public ApiResponse<List<CaseInvestigationLogResponse>> history(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.success("Case history retrieved", service.history(id, authentication));
    }

    @GetMapping("/assigned-to-me")
    @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<List<CaseReportResponse>> assignedToMe(Authentication authentication) {
        return ApiResponse.success("Assigned cases retrieved", service.assignedToMe(authentication));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN')")
    public ApiResponse<CaseInvestigationLogResponse> note(@PathVariable Long id, @Valid @RequestBody CaseNoteRequest request, Authentication authentication) {
        return ApiResponse.success("Investigation note added", service.addNote(id, request.getRemarks(), request.getAttachmentUrl(), authentication));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN')")
    public ApiResponse<List<CaseReportResponse>> search(@RequestParam(required = false) CaseStatus status, @RequestParam(required = false) UrgencyLevel urgency,
                                                        @RequestParam(required = false) String district, @RequestParam(required = false) LocalDate from,
                                                        @RequestParam(required = false) LocalDate to, @RequestParam(required = false) Long assignedOfficerId,
                                                        @RequestParam(required = false) String keyword, Authentication authentication) {
        return ApiResponse.success("Cases retrieved", service.search(status, urgency, district, from, to, assignedOfficerId, keyword, authentication));
    }
}
