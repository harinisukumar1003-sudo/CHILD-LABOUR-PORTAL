package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import static com.clrms.util.InputSanitizer.clean;

@Service
public class RehabilitationService {
    private final RehabilitationCaseRepository rehabCases;
    private final RehabilitationActivityRepository activities;
    private final RehabilitationCenterRepository centers;
    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;
    private final CaseInvestigationLogRepository investigationLogs;
    private final ApplicationEventPublisher eventPublisher;

    public RehabilitationService(RehabilitationCaseRepository rehabCases, RehabilitationActivityRepository activities,
                                  RehabilitationCenterRepository centers, CaseReportRepository reports,
                                  CaseAssignmentRepository assignments, CaseInvestigationLogRepository investigationLogs, ApplicationEventPublisher eventPublisher) {
        this.rehabCases = rehabCases; this.activities = activities; this.centers = centers; this.reports = reports;
        this.assignments = assignments; this.investigationLogs = investigationLogs; this.eventPublisher = eventPublisher;
    }

    @Transactional
    public RehabilitationCaseResponse create(RehabilitationCaseRequest request, Authentication authentication) {
        requireStaff(authentication);
        CaseReport report = report(request.getCaseReportId());
        if (report.getStatus() != CaseStatus.RESCUED) throw bad("Rehabilitation can only start for a rescued case");
        if (rehabCases.existsByCaseReportId(report.getId())) throw bad("A rehabilitation case already exists for this report");
        center(request.getRehabilitationCenterId());
        RehabilitationCase rehab = new RehabilitationCase();
        rehab.setCaseReportId(report.getId()); rehab.setChildAlias(clean(request.getChildAlias()));
        rehab.setRehabilitationCenterId(request.getRehabilitationCenterId()); rehab.setStartDate(request.getStartDate());
        rehab.setCurrentPhase(request.getCurrentPhase()); rehab.setAssignedCounsellorId(request.getAssignedCounsellorId());
        RehabilitationCase saved = rehabCases.save(rehab);
        report.setStatus(CaseStatus.REHABILITATION); reports.save(report);
        CaseInvestigationLog log = new CaseInvestigationLog(); log.setCaseReportId(report.getId()); log.setUpdatedByUserId(userId(authentication));
        log.setPreviousStatus(CaseStatus.RESCUED); log.setNewStatus(CaseStatus.REHABILITATION); log.setRemarks("Rehabilitation plan created"); investigationLogs.save(log);
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(), CaseStatus.RESCUED, CaseStatus.REHABILITATION, userId(authentication), rehab.getAssignedCounsellorId(), report.getUrgencyLevel(), "Rehabilitation plan created"));
        return RehabilitationCaseResponse.from(saved);
    }

    @Transactional
    public RehabilitationActivityResponse addActivity(Long id, RehabilitationActivityRequest request, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireMutationAccess(rehab, authentication);
        RehabilitationActivity activity = new RehabilitationActivity(); activity.setRehabilitationCaseId(id);
        activity.setActivityType(request.getActivityType()); activity.setDescription(clean(request.getDescription())); activity.setProviderName(clean(request.getProviderName()));
        activity.setActivityDate(request.getActivityDate()); activity.setOutcomeNotes(clean(request.getOutcomeNotes())); activity.setNextFollowUpDate(request.getNextFollowUpDate());
        activity.setRecordedByUserId(userId(authentication));
        return RehabilitationActivityResponse.from(activities.save(activity));
    }

    @Transactional(readOnly = true)
    public List<RehabilitationActivityResponse> activities(Long id, Authentication authentication) {
        requireStaff(authentication); rehabCase(id);
        return activities.findByRehabilitationCaseIdOrderByActivityDateAscIdAsc(id).stream().map(RehabilitationActivityResponse::from).toList();
    }

    @Transactional
    public RehabilitationCaseResponse updatePhase(Long id, RehabilitationPhaseRequest request, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireMutationAccess(rehab, authentication);
        if (request.getPhase().ordinal() < rehab.getCurrentPhase().ordinal()) throw bad("Rehabilitation phases cannot move backwards");
        rehab.setCurrentPhase(request.getPhase()); return RehabilitationCaseResponse.from(rehabCases.save(rehab));
    }

    @Transactional(readOnly = true)
    public List<RehabilitationActivityResponse> dueFollowUps(Long id, Authentication authentication) {
        requireStaff(authentication); rehabCase(id);
        return activities.findByRehabilitationCaseIdAndNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(id, LocalDate.now()).stream().map(RehabilitationActivityResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RehabilitationCaseResponse get(Long id, Authentication authentication) { requireStaff(authentication); return RehabilitationCaseResponse.from(rehabCase(id)); }

    @Transactional(readOnly = true)
    public RehabilitationIdentityResponse identity(Long id, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireSensitiveAccess(rehab, authentication);
        return new RehabilitationIdentityResponse(id, rehab.getCaseReportId(), report(rehab.getCaseReportId()).getChildName());
    }

    @Transactional(readOnly = true)
    public List<RehabilitationCenterResponse> listCenters(Authentication authentication) { requireStaff(authentication); return centers.findAll().stream().map(RehabilitationCenterResponse::from).toList(); }
    @Transactional public RehabilitationCenterResponse createCenter(RehabilitationCenterRequest request, Authentication authentication) { requireAdmin(authentication); @SuppressWarnings("null") RehabilitationCenterResponse result = RehabilitationCenterResponse.from(centers.save(toCenter(request, new RehabilitationCenter()))); return result; }
    @Transactional public RehabilitationCenterResponse updateCenter(Long id, RehabilitationCenterRequest request, Authentication authentication) { requireAdmin(authentication); @SuppressWarnings("null") RehabilitationCenterResponse result = RehabilitationCenterResponse.from(centers.save(toCenter(request, center(id)))); return result; }
    @Transactional 
    @SuppressWarnings("null")
    public void deleteCenter(Long id, Authentication authentication) { 
        requireAdmin(authentication); 
        RehabilitationCenter deletable = center(id); 
        centers.delete(deletable); 
    }

    private RehabilitationCenter toCenter(RehabilitationCenterRequest request, RehabilitationCenter center) { center.setName(clean(request.getName())); center.setAddress(clean(request.getAddress())); center.setContactPerson(clean(request.getContactPerson())); center.setContactPhone(clean(request.getContactPhone())); center.setCapacity(request.getCapacity()); center.setServicesOffered(clean(request.getServicesOffered())); return center; }
    private void requireSensitiveAccess(RehabilitationCase rehab, Authentication authentication) { requireStaff(authentication); if (hasRole(authentication, "ADMIN")) return; Long actor = userId(authentication); CaseAssignment assignment = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(rehab.getCaseReportId()).orElse(null); if (actor.equals(rehab.getAssignedCounsellorId()) || (assignment != null && actor.equals(assignment.getAssignedOfficerId()))) return; throw forbidden("Sensitive child identity is restricted to the counsellor or case owner"); }
    private void requireMutationAccess(RehabilitationCase rehab, Authentication authentication) { requireSensitiveAccess(rehab, authentication); }
    private void requireAdmin(Authentication authentication) { if (!hasRole(authentication, "ADMIN")) throw forbidden("Administrator access is required"); }
    private void requireStaff(Authentication authentication) { if (!(hasRole(authentication, "OFFICER") || hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "ADMIN"))) throw forbidden("Staff access is required"); }
    private boolean hasRole(Authentication authentication, String role) { return authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role)); }
    private Long userId(Authentication authentication) { try { return Long.valueOf(authentication.getName()); } catch (Exception ignored) { throw forbidden("Authenticated user id is required"); } }
    private CaseReport report(Long id) { @SuppressWarnings("null") CaseReport result = reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")); return result; }
    private RehabilitationCase rehabCase(Long id) { @SuppressWarnings("null") RehabilitationCase result = rehabCases.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rehabilitation case not found")); return result; }
    private RehabilitationCenter center(Long id) { @SuppressWarnings("null") RehabilitationCenter result = centers.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rehabilitation center not found")); return result; }
    private IllegalArgumentException bad(String message) { return new IllegalArgumentException(message); }
    private ResponseStatusException forbidden(String message) { return new ResponseStatusException(HttpStatus.FORBIDDEN, message); }
}