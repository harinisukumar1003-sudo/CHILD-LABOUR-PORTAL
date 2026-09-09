package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.CaseReportRequest;
import com.clrms.dto.CaseReportResponse;
import com.clrms.dto.CaseReportPublicResponse;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import com.clrms.service.CaseReportService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class CaseReportController {
    private final CaseReportService service;

    public CaseReportController(CaseReportService service) { this.service = service; }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<CaseReportResponse>> create(@Valid @ModelAttribute CaseReportRequest request,
                                                                    @RequestPart(value = "files", required = false) List<MultipartFile> files,
                                                                    Authentication authentication) {
        CaseReportResponse response = service.create(request, files, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Report submitted", response));
    }

    @GetMapping("/my-reports")
    @PreAuthorize("hasRole('CITIZEN')")
    public ApiResponse<List<CaseReportResponse>> myReports(Authentication authentication) {
        return ApiResponse.success("Reports retrieved", service.myReports(authentication));
    }

    @GetMapping("/{caseNumber}/track")
    @PreAuthorize("permitAll()")
    public ApiResponse<CaseReportPublicResponse> track(@PathVariable String caseNumber, @RequestParam String trackingCode) {
        return ApiResponse.success("Report status retrieved", service.track(caseNumber, trackingCode));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OFFICER', 'ADMIN')")
    public ApiResponse<Page<CaseReportResponse>> search(@RequestParam(required = false) CaseStatus status,
                                                         @RequestParam(required = false) UrgencyLevel urgency,
                                                         @RequestParam(required = false) String district,
                                                         @RequestParam(required = false) LocalDate from,
                                                         @RequestParam(required = false) LocalDate to,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        int boundedSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), boundedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ApiResponse.success("Reports retrieved", service.search(status, urgency, district, from, to, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CITIZEN') or hasAnyRole('OFFICER', 'NGO_STAFF', 'ADMIN')")
    public ApiResponse<CaseReportResponse> get(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.success("Report retrieved", service.get(id, authentication));
    }
}