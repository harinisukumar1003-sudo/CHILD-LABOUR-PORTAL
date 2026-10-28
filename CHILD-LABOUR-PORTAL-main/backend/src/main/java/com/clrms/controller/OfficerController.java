package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.CaseReportResponse;
import com.clrms.dto.OfficerAssignmentOptionResponse;
import com.clrms.service.AdminManagementService;
import com.clrms.service.CaseManagementService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OfficerController {
    private final AdminManagementService adminManagement;
    private final CaseManagementService caseManagement;

    public OfficerController(AdminManagementService adminManagement, CaseManagementService caseManagement) {
        this.adminManagement = adminManagement;
        this.caseManagement = caseManagement;
    }

    @GetMapping("/officers")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<OfficerAssignmentOptionResponse>> officers(
            @RequestParam(required = false) Long caseId) {
        return ApiResponse.success("Active officers retrieved", adminManagement.officers(caseId));
    }

    @GetMapping("/my-cases")
    @PreAuthorize("hasRole('OFFICER')")
    public ApiResponse<List<CaseReportResponse>> myCases(Authentication authentication) {
        return ApiResponse.success("Assigned cases retrieved", caseManagement.assignedToMe(authentication));
    }
}
