package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.repository.*;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Table;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.*;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class AdminManagementService {
    private final CaseReportRepository reports; private final CaseInvestigationLogRepository logs; private final UserRepository users; private final AuditLogRepository audit;
    public AdminManagementService(CaseReportRepository reports, CaseInvestigationLogRepository logs, UserRepository users, AuditLogRepository audit) { this.reports = reports; this.logs = logs; this.users = users; this.audit = audit; }

    @Transactional(readOnly = true) public AdminDashboardOverviewResponse overview(AuthenticationUser admin) { List<CaseReport> cases = reports.findAll(); long total = cases.size(); long thisMonth = cases.stream().filter(report -> YearMonth.from(report.getCreatedAt().atZone(ZoneOffset.UTC)).equals(YearMonth.now(ZoneOffset.UTC))).count(); long resolved = cases.stream().filter(report -> report.getStatus() == CaseStatus.CLOSED).count(); List<Double> rescue = averageDurations(cases, CaseStatus.RESCUED); List<Double> closure = averageDurations(cases, CaseStatus.CLOSED); return new AdminDashboardOverviewResponse(total, thisMonth, total == 0 ? 0 : resolved * 100d / total, average(rescue), average(closure), users.countByRoleAndStatus(UserRole.OFFICER, UserStatus.ACTIVE), users.countByRoleAndStatus(UserRole.OFFICER, UserStatus.PENDING) + users.countByRoleAndStatus(UserRole.NGO_STAFF, UserStatus.PENDING)); }
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public List<AdminChartPointResponse> byStatus(AuthenticationUser admin) { return reports.findAll().stream().collect(Collectors.groupingBy(CaseReport::getStatus, () -> new EnumMap<>(CaseStatus.class), Collectors.counting())).entrySet().stream().map(entry -> new AdminChartPointResponse(entry.getKey().name(), entry.getValue())).toList(); }
    @Transactional(readOnly = true) public List<AdminChartPointResponse> byDistrict(AuthenticationUser admin) { return reports.findAll().stream().collect(Collectors.groupingBy(report -> unknown(report.getDistrict()), Collectors.counting())).entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).map(entry -> new AdminChartPointResponse(entry.getKey(), entry.getValue())).toList(); }
    @Transactional(readOnly = true) public List<AdminTrendPointResponse> trend(AuthenticationUser admin) { YearMonth start = YearMonth.now(ZoneOffset.UTC).minusMonths(11); Map<YearMonth, List<CaseReport>> grouped = reports.findAll().stream().filter(report -> !YearMonth.from(report.getCreatedAt().atZone(ZoneOffset.UTC)).isBefore(start)).collect(Collectors.groupingBy(report -> YearMonth.from(report.getCreatedAt().atZone(ZoneOffset.UTC)))); return java.util.stream.Stream.iterate(start, month -> month.plusMonths(1)).limit(12).map(month -> { List<CaseReport> monthCases = grouped.getOrDefault(month, List.of()); return new AdminTrendPointResponse(month.toString(), monthCases.size(), monthCases.stream().filter(report -> report.getStatus() == CaseStatus.CLOSED).count()); }).toList(); }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<AdminUserResponse> users(UserRole role, UserStatus status, Pageable pageable, AuthenticationUser admin) { Page<User> result = role != null && status != null ? users.findByRoleAndStatus(role, status, pageable) : role != null ? users.findByRole(role, pageable) : status != null ? users.findByStatus(status, pageable) : users.findAll(pageable); return result.map(AdminUserResponse::from); }
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<AuditLogResponse> auditLogs(Pageable pageable, AuthenticationUser admin) { return audit.findAll(pageable).map(AuditLogResponse::from); }
    @Transactional public AdminUserResponse approve(Long id, AuthenticationUser admin, String ip) { User user = user(id); user.setStatus(UserStatus.ACTIVE); AdminUserResponse result = AdminUserResponse.from(users.save(user)); record(admin, "APPROVE_USER", "User", id, ip); return result; }
    @Transactional public AdminUserResponse suspend(Long id, AuthenticationUser admin, String ip) { User user = user(id); user.setStatus(UserStatus.SUSPENDED); AdminUserResponse result = AdminUserResponse.from(users.save(user)); record(admin, "SUSPEND_USER", "User", id, ip); return result; }
    @Transactional public AdminUserResponse role(Long id, AdminRoleRequest request, AuthenticationUser admin, String ip) { User user = user(id); user.setRole(request.getRole()); AdminUserResponse result = AdminUserResponse.from(users.save(user)); record(admin, "CHANGE_USER_ROLE", "User", id, ip); return result; }

    @Transactional public ExportFile export(CaseStatus status, UrgencyLevel urgency, String district, LocalDate from, LocalDate to, String keyword, String format, AuthenticationUser admin, String ip) { List<CaseReport> filtered = filtered(status, urgency, district, from, to, keyword); record(admin, "EXPORT_REPORTS_" + format.toUpperCase(Locale.ROOT), "CaseReport", null, ip); return "pdf".equalsIgnoreCase(format) ? pdf(filtered) : csv(filtered); }
    private ExportFile csv(List<CaseReport> cases) { StringBuilder csv = new StringBuilder("Case Number,Status,Urgency,District,Incident Date,Created At\n"); cases.forEach(report -> csv.append(row(report.getCaseNumber())).append(',').append(row(report.getStatus())).append(',').append(row(report.getUrgencyLevel())).append(',').append(row(report.getDistrict())).append(',').append(row(report.getDateOfIncident())).append(',').append(row(report.getCreatedAt())).append('\n')); return new ExportFile("text/csv", "clrms-case-report.csv", csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
    private ExportFile pdf(List<CaseReport> cases) { try { ByteArrayOutputStream output = new ByteArrayOutputStream(); Document document = new Document(); PdfWriter.getInstance(document, output); document.open(); document.add(new Paragraph("CLRMS Official Case Report")); document.add(new Paragraph("Generated " + Instant.now())); Table table = new Table(6); for (String heading : List.of("Case", "Status", "Urgency", "District", "Incident date", "Created")) table.addCell(heading); cases.forEach(report -> { table.addCell(String.valueOf(report.getCaseNumber())); table.addCell(String.valueOf(report.getStatus())); table.addCell(String.valueOf(report.getUrgencyLevel())); table.addCell(String.valueOf(report.getDistrict())); table.addCell(String.valueOf(report.getDateOfIncident())); table.addCell(String.valueOf(report.getCreatedAt())); }); document.add(table); document.close(); return new ExportFile("application/pdf", "clrms-case-report.pdf", output.toByteArray()); } catch (Exception exception) { throw new IllegalStateException("Could not generate PDF export", exception); } }
    private List<CaseReport> filtered(CaseStatus status, UrgencyLevel urgency, String district, LocalDate from, LocalDate to, String keyword) { Predicate<CaseReport> predicate = report -> (status == null || report.getStatus() == status) && (urgency == null || report.getUrgencyLevel() == urgency) && (district == null || district.isBlank() || district.equalsIgnoreCase(report.getDistrict())) && (from == null || (report.getDateOfIncident() != null && !report.getDateOfIncident().isBefore(from))) && (to == null || (report.getDateOfIncident() != null && !report.getDateOfIncident().isAfter(to))) && (keyword == null || keyword.isBlank() || (report.getCaseNumber() + " " + report.getIncidentDescription() + " " + report.getLocationAddress()).toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT))); return reports.findAll().stream().filter(predicate).toList(); }
    private List<Double> averageDurations(List<CaseReport> cases, CaseStatus target) { return cases.stream().map(report -> logs.findByCaseReportIdOrderByCreatedAtAsc(report.getId()).stream().filter(log -> log.getNewStatus() == target).findFirst().map(log -> Duration.between(report.getCreatedAt(), log.getCreatedAt()).toMinutes() / 60d).orElse(null)).filter(Objects::nonNull).toList(); }
    @SuppressWarnings("null")
    private double average(List<Double> values) { return values.stream().mapToDouble(Double::doubleValue).average().orElse(0); }
    private String unknown(String value) { return value == null || value.isBlank() ? "UNKNOWN" : value; }
    private String row(Object value) { return "\"" + String.valueOf(value == null ? "" : value).replace("\"", "\"\"") + "\""; }
    @SuppressWarnings("null")
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")); }
    private void record(AuthenticationUser admin, String action, String entity, Long target, String ip) { AuditLog log = new AuditLog(); log.setAdminUserId(admin.id()); log.setAction(action); log.setTargetEntity(entity); log.setTargetId(target); log.setIpAddress(ip); audit.save(log); }
    public record AuthenticationUser(Long id) { }
    public record ExportFile(String contentType, String filename, byte[] content) { }
}