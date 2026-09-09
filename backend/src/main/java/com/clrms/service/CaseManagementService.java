package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.repository.CaseAssignmentRepository;
import com.clrms.repository.CaseInvestigationLogRepository;
import com.clrms.repository.CaseReportRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import static com.clrms.util.InputSanitizer.clean;

@Service
public class CaseManagementService {
    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;
    private final CaseInvestigationLogRepository logs;
    private final CaseStatusTransitionService transitions;
    private final ApplicationEventPublisher eventPublisher;

    public CaseManagementService(CaseReportRepository reports, CaseAssignmentRepository assignments,
                                 CaseInvestigationLogRepository logs, CaseStatusTransitionService transitions, ApplicationEventPublisher eventPublisher) {
        this.reports = reports;
        this.assignments = assignments;
        this.logs = logs;
        this.transitions = transitions;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public CaseAssignmentResponse assign(Long caseId, CaseAssignmentRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireRole(authentication, "ADMIN");
        if (report.getDistrict() == null || !report.getDistrict().equalsIgnoreCase(request.getJurisdiction().trim())) {
            throw new IllegalArgumentException("Assignment jurisdiction must match the case district");
        }
        if (report.getStatus() != CaseStatus.UNDER_REVIEW) {
            throw new IllegalArgumentException("Only cases under review can be assigned");
        }
        CaseAssignment assignment = new CaseAssignment();
        assignment.setCaseReportId(caseId);
        assignment.setAssignedOfficerId(request.getAssignedOfficerId());
        assignment.setAssignedByAdminId(userId(authentication));
        assignment.setJurisdiction(request.getJurisdiction().trim());
        assignment.setNotes(request.getNotes());
        CaseAssignmentResponse response = CaseAssignmentResponse.from(assignments.save(assignment));
        eventPublisher.publishEvent(new CaseAssignedEvent(assignment, caseId, report.getCaseNumber(), assignment.getAssignedOfficerId(), assignment.getAssignedByAdminId(), report.getUrgencyLevel()));
        updateStatus(report, CaseStatus.ASSIGNED, "Case assigned to officer " + request.getAssignedOfficerId(), null, authentication);
        return response;
    }

    @Transactional
    public CaseInvestigationLogResponse updateStatus(Long caseId, CaseStatusUpdateRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);
        return CaseInvestigationLogResponse.from(updateStatus(report, request.getStatus(), request.getRemarks(), request.getAttachmentUrl(), authentication));
    }

    @Transactional(readOnly = true)
    public List<CaseInvestigationLogResponse> history(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);
        return logs.findByCaseReportIdOrderByCreatedAtAsc(caseId).stream().map(CaseInvestigationLogResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CaseReportResponse> assignedToMe(Authentication authentication) {
        requireRole(authentication, "OFFICER");
        return assignments.findByAssignedOfficerIdOrderByAssignedAtDesc(userId(authentication)).stream()
                .map(assignment -> report(assignment.getCaseReportId()))
                .map(report -> CaseReportResponse.from(report, false)).toList();
    }

    @Transactional
    public CaseInvestigationLogResponse addNote(Long caseId, String remarks, String attachmentUrl, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);
        if (remarks == null || remarks.isBlank()) throw new IllegalArgumentException("Notes are required");
        return CaseInvestigationLogResponse.from(saveLog(report, authentication, report.getStatus(), report.getStatus(), remarks, attachmentUrl));
    }

    @Transactional(readOnly = true)
    public List<CaseReportResponse> search(CaseStatus status, UrgencyLevel urgency, String district, LocalDate from,
                                           LocalDate to, Long assignedOfficerId, String keyword, Authentication authentication) {
        requireStaff(authentication);
        Specification<CaseReport> specification = Specification.where(status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status));
        if (urgency != null) specification = specification.and((root, query, cb) -> cb.equal(root.get("urgencyLevel"), urgency));
        if (district != null && !district.isBlank()) specification = specification.and((root, query, cb) -> cb.equal(root.get("district"), district));
        if (from != null) specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateOfIncident"), from));
        if (to != null) specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("dateOfIncident"), to));
        if (assignedOfficerId != null) specification = specification.and((root, query, cb) -> {
            @SuppressWarnings("null")
            var subquery = query.subquery(Long.class);
            var assignment = subquery.from(CaseAssignment.class);
            subquery.select(assignment.get("caseReportId")).where(cb.equal(assignment.get("assignedOfficerId"), assignedOfficerId), cb.equal(assignment.get("caseReportId"), root.get("id")));
            return cb.exists(subquery);
        });
        if (keyword != null && !keyword.isBlank()) specification = specification.and((root, query, cb) -> {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(cb.like(cb.lower(root.get("caseNumber")), pattern), cb.like(cb.lower(root.get("incidentDescription")), pattern), cb.like(cb.lower(root.get("locationAddress")), pattern));
        });
        return reports.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt")).stream().map(report -> hasRole(authentication, "NGO_STAFF") ? CaseReportResponse.forNgo(report) : CaseReportResponse.from(report, false)).toList();
    }

    private CaseInvestigationLog updateStatus(CaseReport report, CaseStatus next, String remarks, String attachmentUrl, Authentication authentication) {
        transitions.validate(report.getStatus(), next, remarks);
        CaseStatus previous = report.getStatus();
        report.setStatus(next);
        reports.save(report);
        CaseInvestigationLog log = saveLog(report, authentication, previous, next, remarks, attachmentUrl);
        @SuppressWarnings("null")
        Long recipientUserId = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(report.getId()).map(CaseAssignment::getAssignedOfficerId).orElse(null);
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(), previous, next, userId(authentication), recipientUserId, report.getUrgencyLevel(), remarks));
        return log;
    }

    private CaseInvestigationLog saveLog(CaseReport report, Authentication authentication, CaseStatus previous, CaseStatus next, String remarks, String attachmentUrl) {
        CaseInvestigationLog log = new CaseInvestigationLog();
        log.setCaseReportId(report.getId()); log.setUpdatedByUserId(userId(authentication));
        log.setPreviousStatus(previous); log.setNewStatus(next); log.setRemarks(clean(remarks)); log.setAttachmentUrl(clean(attachmentUrl));
        return logs.save(log);
    }

    private void checkAccess(CaseReport report, Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return;
        CaseAssignment assignment = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(report.getId()).orElse(null);
        if (assignment == null || !assignment.getAssignedOfficerId().equals(userId(authentication))) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Case is not assigned to you");
    }

    @SuppressWarnings("null")
    private CaseReport report(Long id) { return reports.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found")); }
    private void requireStaff(Authentication authentication) { if (!(hasRole(authentication, "OFFICER") || hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "ADMIN"))) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN); }
    private void requireRole(Authentication authentication, String role) { if (!hasRole(authentication, role)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN); }
    private Long userId(Authentication authentication) { try { return Long.valueOf(authentication.getName()); } catch (Exception ignored) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Authenticated user id is required"); } }
    private boolean hasRole(Authentication authentication, String role) { return authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role)); }
}