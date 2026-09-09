package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.service.AdminManagementService;
import com.clrms.service.AdminManagementService.AuthenticationUser;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminManagementController {
    private final AdminManagementService service;
    public AdminManagementController(AdminManagementService service) { this.service = service; }
    @GetMapping("/dashboard/overview") public ApiResponse<AdminDashboardOverviewResponse> overview(Authentication authentication) { return ApiResponse.success("Admin overview retrieved", service.overview(user(authentication))); }
    @GetMapping("/dashboard/cases-by-status") public ApiResponse<List<AdminChartPointResponse>> byStatus(Authentication authentication) { return ApiResponse.success("Status analytics retrieved", service.byStatus(user(authentication))); }
    @GetMapping("/dashboard/cases-by-district") public ApiResponse<List<AdminChartPointResponse>> byDistrict(Authentication authentication) { return ApiResponse.success("District analytics retrieved", service.byDistrict(user(authentication))); }
    @GetMapping("/dashboard/cases-trend") public ApiResponse<List<AdminTrendPointResponse>> trend(Authentication authentication) { return ApiResponse.success("Case trend retrieved", service.trend(user(authentication))); }
    @GetMapping("/users") public ApiResponse<Page<AdminUserResponse>> users(@RequestParam(required = false) UserRole role, @RequestParam(required = false) UserStatus status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, Authentication authentication) { Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt")); return ApiResponse.success("Users retrieved", service.users(role, status, pageable, user(authentication))); }
    @GetMapping("/audit-logs") public ApiResponse<Page<AuditLogResponse>> auditLogs(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size, Authentication authentication) { Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "timestamp")); return ApiResponse.success("Audit logs retrieved", service.auditLogs(pageable, user(authentication))); }
    @PutMapping("/users/{id}/approve") public ApiResponse<AdminUserResponse> approve(@PathVariable Long id, Authentication authentication, HttpServletRequest request) { return ApiResponse.success("User approved", service.approve(id, user(authentication), request.getRemoteAddr())); }
    @PutMapping("/users/{id}/suspend") public ApiResponse<AdminUserResponse> suspend(@PathVariable Long id, Authentication authentication, HttpServletRequest request) { return ApiResponse.success("User suspended", service.suspend(id, user(authentication), request.getRemoteAddr())); }
    @PutMapping("/users/{id}/role") public ApiResponse<AdminUserResponse> role(@PathVariable Long id, @Valid @RequestBody AdminRoleRequest body, Authentication authentication, HttpServletRequest request) { return ApiResponse.success("User role updated", service.role(id, body, user(authentication), request.getRemoteAddr())); }
    @GetMapping("/reports/export")
    @SuppressWarnings("null")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) CaseStatus status, @RequestParam(required = false) UrgencyLevel urgency, @RequestParam(required = false) String district, @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to, @RequestParam(required = false) String keyword, @RequestParam(defaultValue = "csv") String format, Authentication authentication, HttpServletRequest request) { AdminManagementService.ExportFile file = service.export(status, urgency, district, from, to, keyword, format, user(authentication), request.getRemoteAddr()); return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType())).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"").body(file.content()); }
    private AuthenticationUser user(Authentication authentication) { try { return new AuthenticationUser(Long.valueOf(authentication.getName())); } catch (Exception ignored) { throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated admin id is required"); } }
}