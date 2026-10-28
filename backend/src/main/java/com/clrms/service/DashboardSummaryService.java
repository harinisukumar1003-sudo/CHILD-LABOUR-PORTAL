package com.clrms.service;

import com.clrms.dto.CaseReportResponse;
import com.clrms.entity.*;
import com.clrms.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardSummaryService {
    private final Map<UserRole, DashboardStrategy> strategies;

    public DashboardSummaryService(CaseReportRepository reports,
                                   CaseAssignmentRepository assignments,
                                   CaseInvestigationLogRepository logs,
                                   RehabilitationCaseRepository rehabilitationCases,
                                   RehabilitationActivityRepository activities,
                                   UserRepository users) {
        var ngoStrategy = new NgoDashboardStrategy(reports, rehabilitationCases, activities);
        this.strategies = Map.of(
            UserRole.CITIZEN, new CitizenDashboardStrategy(reports),
            UserRole.OFFICER, new StaffDashboardStrategy(reports, assignments, logs, rehabilitationCases, activities),
            UserRole.NGO_STAFF, ngoStrategy,
            UserRole.NGO_OFFICIAL, ngoStrategy,
            UserRole.ADMIN, new AdminDashboardStrategy(reports, users)
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summarize(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserRole role = authentication.getAuthorities().stream()
            .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
            .map(value -> {
                try { return UserRole.valueOf(value); }
                catch (IllegalArgumentException ignored) { return null; }
            })
            .filter(Objects::nonNull)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "A supported role is required"));
        Long userId = userId(authentication);
        DashboardStrategy strategy = strategies.get(role);
        if (strategy == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A supported role is required");
        return strategy.summarize(userId);
    }

    private interface DashboardStrategy {
        Map<String, Object> summarize(Long userId);
    }

    private static final class CitizenDashboardStrategy implements DashboardStrategy {
        private static final String TRACKING_TIPS = "Keep your case number and tracking code private. Use both to check for updates.";
        private final CaseReportRepository reports;

        private CitizenDashboardStrategy(CaseReportRepository reports) { this.reports = reports; }

        @Override
        public Map<String, Object> summarize(Long userId) {
            List<CaseReport> mine = reports.findByReporterIdOrderByCreatedAtDesc(userId);
            Map<String, Long> byStatus = statusCounts(mine);
            List<CaseReportResponse> recent = mine.stream().limit(5)
                .map(report -> CaseReportResponse.from(report, true)).toList();
            return Map.of("totalMyReports", mine.size(), "byStatus", byStatus,
                "recentReports", recent, "trackingTips", TRACKING_TIPS);
        }
    }

    private static final class StaffDashboardStrategy implements DashboardStrategy {
        private final CaseReportRepository reports;
        private final CaseAssignmentRepository assignments;
        private final CaseInvestigationLogRepository logs;
        private final RehabilitationCaseRepository rehabilitationCases;
        private final RehabilitationActivityRepository activities;

        private StaffDashboardStrategy(CaseReportRepository reports, CaseAssignmentRepository assignments,
                                       CaseInvestigationLogRepository logs, RehabilitationCaseRepository rehabilitationCases,
                                       RehabilitationActivityRepository activities) {
            this.reports = reports;
            this.assignments = assignments;
            this.logs = logs;
            this.rehabilitationCases = rehabilitationCases;
            this.activities = activities;
        }

        @Override
        public Map<String, Object> summarize(Long userId) {
            Map<Long, CaseAssignment> latestByCase = new HashMap<>();
            assignments.findByAssignedOfficerIdOrderByAssignedAtDesc(userId)
                .forEach(assignment -> latestByCase.putIfAbsent(assignment.getCaseReportId(), assignment));
            List<CaseReport> assigned = List.of();
            if (!latestByCase.isEmpty()) {
                List<Long> assignedIds = new ArrayList<>();
                for (Long id : latestByCase.keySet()) assignedIds.add(Objects.requireNonNull(id));
                assigned = reports.findAllById(assignedIds);
            }
            List<CaseReport> active = assigned.stream().filter(report -> latestByCase.containsKey(report.getId())).toList();
            Map<Long, CaseReport> reportById = new HashMap<>();
            List<Long> activeIds = new ArrayList<>();
            for (CaseReport report : active) {
                CaseReport nonNullReport = Objects.requireNonNull(report);
                Long reportId = Objects.requireNonNull(nonNullReport.getId());
                reportById.put(reportId, nonNullReport);
                activeIds.add(reportId);
            }
            List<CaseInvestigationLog> caseLogs = activeIds.isEmpty() ? List.of()
                : logs.findByCaseReportIdInOrderByCreatedAtDesc(activeIds);
            List<Map<String, Object>> recentActivity = caseLogs.stream().limit(10).map(log -> {
                CaseReport report = reportById.get(log.getCaseReportId());
                return Map.<String, Object>of("caseNumber", report.getCaseNumber(), "status", log.getNewStatus().name(),
                    "remarks", log.getRemarks(), "createdAt", log.getCreatedAt());
            }).toList();

            Set<CaseStatus> pendingStatuses = EnumSet.of(CaseStatus.REPORTED, CaseStatus.UNDER_REVIEW,
                CaseStatus.ASSIGNED_TO_OFFICER, CaseStatus.INVESTIGATING);
            long pending = active.stream().filter(report -> pendingStatuses.contains(report.getStatus())).count();
            long critical = active.stream().filter(report -> report.getUrgencyLevel() == UrgencyLevel.CRITICAL
                && report.getStatus() != CaseStatus.CLOSED && report.getStatus() != CaseStatus.REJECTED).count();
            List<Map<String, Object>> upcomingFollowUps = upcomingFollowUps(active);
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            long followUpsDueToday = followUpsDueToday(active, today);
            return Map.of("assignedCasesCount", active.size(), "pendingInvestigations", pending,
                "criticalCasesCount", critical, "followUpsDueToday", followUpsDueToday,
                "assignedCases", caseQueue(active), "casesByStatus", statusCounts(active),
                "recentActivity", recentActivity, "upcomingFollowUps", upcomingFollowUps);
        }

        private List<Map<String, Object>> caseQueue(List<CaseReport> assigned) {
            return assigned.stream().map(report -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", report.getId());
                item.put("caseNumber", report.getCaseNumber());
                item.put("status", report.getStatus().name());
                item.put("urgencyLevel", report.getUrgencyLevel().name());
                item.put("district", report.getDistrict());
                item.put("createdAt", report.getCreatedAt());
                return item;
            }).toList();
        }

        private List<Map<String, Object>> upcomingFollowUps(List<CaseReport> assigned) {
            if (assigned.isEmpty()) return List.of();
            List<Long> caseIds = new ArrayList<>();
            Map<Long, String> caseNumbers = new HashMap<>();
            for (CaseReport item : assigned) {
                CaseReport report = Objects.requireNonNull(item);
                Long id = Objects.requireNonNull(report.getId());
                caseIds.add(id);
                caseNumbers.put(id, report.getCaseNumber());
            }
            List<RehabilitationCase> linked = rehabilitationCases.findByCaseReportIdIn(caseIds);
            if (linked.isEmpty()) return List.of();
            Set<Long> rehabIds = new HashSet<>();
            for (RehabilitationCase rehabilitationCase : linked) {
                rehabIds.add(Objects.requireNonNull(Objects.requireNonNull(rehabilitationCase).getId()));
            }
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            return activities.findByRehabilitationCaseIdInAndNextFollowUpDateGreaterThanEqualOrderByNextFollowUpDateAsc(
                    rehabIds, today, PageRequest.of(0, 10)).stream()
                .map(activity -> {
                    RehabilitationCase rehab = linked.stream().filter(item -> item.getId().equals(activity.getRehabilitationCaseId())).findFirst().orElseThrow();
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", activity.getId());
                    item.put("rehabilitationCaseId", activity.getRehabilitationCaseId());
                    item.put("caseNumber", caseNumbers.get(rehab.getCaseReportId()));
                    item.put("followUpDate", activity.getNextFollowUpDate());
                    item.put("activityType", activity.getActivityType().name());
                    item.put("description", activity.getDescription());
                    item.put("providerName", activity.getProviderName());
                    return item;
                }).toList();
        }

        private long followUpsDueToday(List<CaseReport> assigned, LocalDate today) {
            if (assigned.isEmpty()) return 0;
            List<Long> caseIds = new ArrayList<>();
            for (CaseReport report : assigned) {
                caseIds.add(Objects.requireNonNull(Objects.requireNonNull(report).getId()));
            }
            Set<Long> rehabilitationIds = new HashSet<>();
            for (RehabilitationCase rehabilitationCase : rehabilitationCases.findByCaseReportIdIn(caseIds)) {
                rehabilitationIds.add(Objects.requireNonNull(Objects.requireNonNull(rehabilitationCase).getId()));
            }
            return rehabilitationIds.isEmpty() ? 0 :
                activities.countByRehabilitationCaseIdInAndNextFollowUpDate(rehabilitationIds, today);
        }
    }

    private static final class AdminDashboardStrategy implements DashboardStrategy {
        private final CaseReportRepository reports;
        private final UserRepository users;

        private AdminDashboardStrategy(CaseReportRepository reports, UserRepository users) {
            this.reports = reports;
            this.users = users;
        }

        @Override
        public Map<String, Object> summarize(Long userId) {
            List<CaseReport> all = reports.findAll();
            long total = all.size();
            YearMonth month = YearMonth.now(ZoneOffset.UTC);
            long thisMonth = all.stream().filter(report -> YearMonth.from(report.getCreatedAt().atZone(ZoneOffset.UTC)).equals(month)).count();
            long resolved = all.stream().filter(report -> report.getStatus() == CaseStatus.CLOSED).count();
            List<Map<String, Object>> trend = new ArrayList<>();
            YearMonth start = month.minusMonths(11);
            for (int i = 0; i < 12; i++) {
                YearMonth current = start.plusMonths(i);
                List<CaseReport> currentCases = all.stream().filter(report -> YearMonth.from(report.getCreatedAt().atZone(ZoneOffset.UTC)).equals(current)).toList();
                trend.add(Map.of("month", current.toString(), "totalCases", currentCases.size(),
                    "resolvedCases", currentCases.stream().filter(report -> report.getStatus() == CaseStatus.CLOSED).count()));
            }
            Map<String, Long> byDistrict = all.stream().collect(Collectors.groupingBy(
                report -> report.getDistrict() == null || report.getDistrict().isBlank() ? "UNKNOWN" : report.getDistrict(),
                TreeMap::new, Collectors.counting()));
            long pendingApprovals = users.countByRoleAndStatus(UserRole.OFFICER, UserStatus.PENDING)
                + users.countByRoleAndStatus(UserRole.NGO_STAFF, UserStatus.PENDING);
            return Map.of("totalCases", total, "casesThisMonth", thisMonth,
                "resolutionRate", total == 0 ? 0d : resolved * 100d / total,
                "pendingApprovals", pendingApprovals, "casesByStatus", statusCounts(all),
                "casesByDistrict", byDistrict, "monthlyTrend", trend,
                "activeOfficers", users.countByRoleAndStatus(UserRole.OFFICER, UserStatus.ACTIVE));
        }
    }

    private static final class NgoDashboardStrategy implements DashboardStrategy {
        private final CaseReportRepository reports;
        private final RehabilitationCaseRepository rehabilitationCases;
        private final RehabilitationActivityRepository activities;
        private NgoDashboardStrategy(CaseReportRepository reports, RehabilitationCaseRepository rehabilitationCases, RehabilitationActivityRepository activities) {
            this.reports = reports; this.rehabilitationCases = rehabilitationCases; this.activities = activities;
        }
        @Override public Map<String, Object> summarize(Long userId) {
            List<RehabilitationCase> assigned = rehabilitationCases.findByAssignedCounsellorIdOrderByStartDateDesc(userId);
            Set<Long> rehabIds = assigned.stream().map(RehabilitationCase::getId).collect(Collectors.toSet());
            List<Long> reportIds = assigned.stream().map(RehabilitationCase::getCaseReportId).toList();
            List<CaseReport> cases = reportIds.isEmpty() ? List.of() : reports.findAllById(reportIds);
            Map<Long, CaseReport> byId = new HashMap<>(); cases.forEach(item -> byId.put(item.getId(), item));
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            long pendingFollowUps = rehabIds.isEmpty() ? 0 : activities.countByRehabilitationCaseIdInAndNextFollowUpDate(rehabIds, today);
            List<Map<String, Object>> queue = assigned.stream().map(rehab -> {
                CaseReport report = byId.get(rehab.getCaseReportId());
                return Map.<String, Object>of("id", rehab.getId(), "caseReportId", rehab.getCaseReportId(),
                        "caseNumber", report == null ? "" : report.getCaseNumber(), "status", report == null ? "" : report.getStatus().name(),
                        "phase", rehab.getCurrentPhase().name(), "startDate", rehab.getStartDate());
            }).toList();
            return Map.of("totalRehabilitationCases", assigned.size(),
                    "newlyReferred", cases.stream().filter(c -> c.getStatus() == CaseStatus.NGO_ASSIGNED).count(),
                    "inProgress", cases.stream().filter(c -> c.getStatus() == CaseStatus.REHABILITATION_IN_PROGRESS).count(),
                    "followUpsPending", pendingFollowUps,
                    "completed", cases.stream().filter(c -> c.getStatus() == CaseStatus.REHABILITATION_COMPLETED || c.getStatus() == CaseStatus.CLOSED).count(),
                    "awaitingAdminReview", cases.stream().filter(c -> c.getStatus() == CaseStatus.REHABILITATION_COMPLETED).count(),
                    "cases", queue);
        }
    }

    private static Map<String, Long> statusCounts(List<CaseReport> reports) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (CaseStatus status : CaseStatus.values()) counts.put(status.name(), 0L);
        reports.stream().collect(Collectors.groupingBy(report -> report.getStatus().name(), Collectors.counting()))
            .forEach(counts::put);
        return counts;
    }

    private static Long userId(Authentication authentication) {
        try { return Long.valueOf(authentication.getName()); }
        catch (Exception ignored) { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user id is required"); }
    }
}
