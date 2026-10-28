package com.clrms.service;

import com.clrms.dto.DashboardStatusSummaryResponse;
import com.clrms.entity.CaseAssignment;
import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import com.clrms.repository.CaseAssignmentRepository;
import com.clrms.repository.CaseReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DashboardStatusSummaryService {
    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;

    public DashboardStatusSummaryService(CaseReportRepository reports, CaseAssignmentRepository assignments) {
        this.reports = reports;
        this.assignments = assignments;
    }

    @Transactional(readOnly = true)
    public DashboardStatusSummaryResponse summarize(Authentication authentication) {
        requireStaff(authentication);
        List<CaseReport> scopedReports = hasRole(authentication, "ADMIN") ? reports.findAll() : assignedReports(userId(authentication));
        EnumMap<CaseStatus, Long> statuses = new EnumMap<>(CaseStatus.class);
        for (CaseStatus status : CaseStatus.values()) statuses.put(status, 0L);
        EnumMap<UrgencyLevel, Long> urgencies = new EnumMap<>(UrgencyLevel.class);
        for (UrgencyLevel urgency : UrgencyLevel.values()) urgencies.put(urgency, 0L);
        @SuppressWarnings("null")
        DashboardStatusSummaryResponse result = new DashboardStatusSummaryResponse(
            count(scopedReports, CaseReport::getStatus, statuses),
            count(scopedReports, report -> blankAsUnknown(report.getDistrict()), new LinkedHashMap<>()),
            count(scopedReports, CaseReport::getUrgencyLevel, urgencies));
        return result;
    }

    private List<CaseReport> assignedReports(Long officerId) {
        Map<Long, CaseAssignment> latestByCase = new HashMap<>();
        for (CaseAssignment assignment : assignments.findByAssignedOfficerIdOrderByAssignedAtDesc(officerId)) latestByCase.putIfAbsent(assignment.getCaseReportId(), assignment);
        @SuppressWarnings("null")
        List<CaseReport> result = reports.findAllById(latestByCase.keySet());
        return result;
    }

    private <K, M extends Map<K, Long>> M count(List<CaseReport> reports, Function<CaseReport, K> key, M result) {
        result.putAll(reports.stream().collect(Collectors.groupingBy(key, Collectors.counting())));
        return result;
    }

    private String blankAsUnknown(String value) { return value == null || value.isBlank() ? "UNKNOWN" : value; }
    private void requireStaff(Authentication authentication) { if (!(hasRole(authentication, "OFFICER") || hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "ADMIN"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Staff access is required"); }
    private boolean hasRole(Authentication authentication, String role) { return authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role)); }
    private Long userId(Authentication authentication) { try { return Long.valueOf(authentication.getName()); } catch (Exception ignored) { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user id is required"); } }
}