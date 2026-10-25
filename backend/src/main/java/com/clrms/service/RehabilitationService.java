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
    private final UserRepository users;
    private final CaseStatusTransitionService transitions;
    private final CaseStatusHistoryRepository statusHistory;
    private final AuditLogRepository audit;

    public RehabilitationService(RehabilitationCaseRepository rehabCases, RehabilitationActivityRepository activities,
                                  RehabilitationCenterRepository centers, CaseReportRepository reports,
                                  CaseAssignmentRepository assignments, CaseInvestigationLogRepository investigationLogs, ApplicationEventPublisher eventPublisher,
                                  UserRepository users, CaseStatusTransitionService transitions, CaseStatusHistoryRepository statusHistory,
                                  AuditLogRepository audit) {
        this.rehabCases = rehabCases; this.activities = activities; this.centers = centers; this.reports = reports;
        this.assignments = assignments; this.investigationLogs = investigationLogs; this.eventPublisher = eventPublisher; this.users = users; this.transitions = transitions; this.statusHistory = statusHistory;
        this.audit = audit;
    }

    @Transactional
    public RehabilitationCaseResponse create(RehabilitationCaseRequest request, Authentication authentication) {
        requireAdmin(authentication);
        CaseReport report = report(request.getCaseReportId());
        if (report.getStatus() != CaseStatus.REHABILITATION_REFERRED) throw bad("Rehabilitation can only be assigned after an officer referral");
        if (rehabCases.existsByCaseReportId(report.getId())) throw bad("A rehabilitation case already exists for this report");
        User ngo = users.findById(request.getAssignedCounsellorId()).orElseThrow(() -> bad("NGO official not found"));
        if ((ngo.getRole() != UserRole.NGO_STAFF && ngo.getRole() != UserRole.NGO_OFFICIAL) || ngo.getStatus() != UserStatus.ACTIVE) throw bad("Choose an active NGO official");
        
        Long centerId = request.getRehabilitationCenterId();
        if (centerId == null || !centers.existsById(centerId)) {
            centerId = centers.findAll().stream().findFirst().map(RehabilitationCenter::getId).orElseGet(() -> {
                RehabilitationCenter defaultCenter = new RehabilitationCenter();
                defaultCenter.setName("State Child Care & Rehabilitation Center");
                defaultCenter.setAddress("42 Welfare Avenue, Central District");
                defaultCenter.setContactPerson("Chief Welfare Officer");
                defaultCenter.setContactPhone("+91 98765 43210");
                defaultCenter.setCapacity(120);
                defaultCenter.setServicesOffered("Counseling, Education, Medical Care, Vocational Training");
                return centers.save(defaultCenter).getId();
            });
        }
        
        RehabilitationCase rehab = new RehabilitationCase();
        rehab.setCaseReportId(report.getId()); rehab.setChildAlias(clean(request.getChildAlias()));
        rehab.setRehabilitationCenterId(centerId); rehab.setStartDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now());
        rehab.setCurrentPhase(request.getCurrentPhase() != null ? request.getCurrentPhase() : RehabilitationPhase.MEDICAL_ASSESSMENT); rehab.setAssignedCounsellorId(request.getAssignedCounsellorId());
        RehabilitationCase saved = rehabCases.save(rehab);
        transitions.validate(report.getStatus(), CaseStatus.NGO_ASSIGNED, "NGO assigned to rehabilitation referral");
        report.setStatus(CaseStatus.NGO_ASSIGNED); reports.save(report);
        CaseInvestigationLog log = new CaseInvestigationLog(); log.setCaseReportId(report.getId()); log.setUpdatedByUserId(userId(authentication));
        log.setPreviousStatus(CaseStatus.REHABILITATION_REFERRED); log.setNewStatus(CaseStatus.NGO_ASSIGNED); log.setRemarks("NGO assigned to rehabilitation referral: " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName())); investigationLogs.save(log);
        recordStatusHistory(report, CaseStatus.REHABILITATION_REFERRED, CaseStatus.NGO_ASSIGNED, authentication, "NGO assigned: " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName()));
        recordAudit(authentication, "ASSIGN_NGO", "CaseReport", report.getId(), "Assigned to NGO " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName()));
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(), CaseStatus.REHABILITATION_REFERRED, CaseStatus.NGO_ASSIGNED, userId(authentication), rehab.getAssignedCounsellorId(), report.getUrgencyLevel(), "NGO assigned to rehabilitation referral"));
        return RehabilitationCaseResponse.from(saved);
    }

    @Transactional
    public RehabilitationActivityResponse addActivity(Long id, RehabilitationActivityRequest request, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireMutationAccess(rehab, authentication);
        RehabilitationActivity activity = new RehabilitationActivity(); activity.setRehabilitationCaseId(id);
        activity.setActivityType(request.getActivityType()); activity.setDescription(clean(request.getDescription())); activity.setProviderName(clean(request.getProviderName()));
        activity.setActivityDate(request.getActivityDate()); activity.setOutcomeNotes(clean(request.getOutcomeNotes())); activity.setNextFollowUpDate(request.getNextFollowUpDate());
        activity.setRecordedByUserId(userId(authentication));
        RehabilitationActivityResponse response = RehabilitationActivityResponse.from(activities.save(activity));
        CaseReport report = report(rehab.getCaseReportId());
        if (report.getStatus() == CaseStatus.NGO_ASSIGNED) changeStatus(report, CaseStatus.REHABILITATION_IN_PROGRESS, "NGO rehabilitation activity recorded", authentication, rehab.getAssignedCounsellorId());
        else notifyProgress(report, authentication, "NGO rehabilitation progress updated");
        return response;
    }

    @Transactional(readOnly = true)
    public List<RehabilitationActivityResponse> activities(Long id, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireRehabilitationAccess(rehab, authentication);
        return activities.findByRehabilitationCaseIdOrderByActivityDateAscIdAsc(id).stream().map(RehabilitationActivityResponse::from).toList();
    }

    @Transactional
    public RehabilitationCaseResponse updatePhase(Long id, RehabilitationPhaseRequest request, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireMutationAccess(rehab, authentication);
        if (request.getPhase().ordinal() < rehab.getCurrentPhase().ordinal()) throw bad("Rehabilitation phases cannot move backwards");
        rehab.setCurrentPhase(request.getPhase());
        RehabilitationCaseResponse response = RehabilitationCaseResponse.from(rehabCases.save(rehab));
        CaseReport report = report(rehab.getCaseReportId());
        if (request.getPhase() == RehabilitationPhase.COMPLETED && report.getStatus() == CaseStatus.REHABILITATION_IN_PROGRESS)
            changeStatus(report, CaseStatus.REHABILITATION_COMPLETED, "NGO completion report submitted", authentication, null);
        else notifyProgress(report, authentication, "NGO rehabilitation progress updated");
        return response;
    }

    @Transactional(readOnly = true)
    public List<RehabilitationActivityResponse> dueFollowUps(Long id, Authentication authentication) {
        RehabilitationCase rehab = rehabCase(id); requireRehabilitationAccess(rehab, authentication);
        return activities.findByRehabilitationCaseIdAndNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(id, LocalDate.now()).stream().map(RehabilitationActivityResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RehabilitationCaseResponse get(Long id, Authentication authentication) { RehabilitationCase rehab = rehabCase(id); requireRehabilitationAccess(rehab, authentication); return RehabilitationCaseResponse.from(rehab); }

    @Transactional(readOnly = true)
    public List<RehabilitationCaseResponse> myCases(Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return rehabCases.findAll().stream().map(RehabilitationCaseResponse::from).toList();
        if (!hasRole(authentication, "NGO_STAFF") && !hasRole(authentication, "NGO_OFFICIAL")) throw forbidden("NGO official access is required");
        Long currentUserId = userId(authentication);
        User currentUser = users.findById(currentUserId).orElse(null);
        return rehabCases.findAll().stream()
                .filter(rc -> {
                    if (rc.getAssignedCounsellorId().equals(currentUserId)) return true;
                    if (currentUser != null && currentUser.getNgoOrganizationId() != null) {
                        User counsellor = users.findById(rc.getAssignedCounsellorId()).orElse(null);
                        return counsellor != null && currentUser.getNgoOrganizationId().equals(counsellor.getNgoOrganizationId());
                    }
                    return false;
                })
                .map(RehabilitationCaseResponse::from)
                .toList();
    }

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
    private void requireSensitiveAccess(RehabilitationCase rehab, Authentication authentication) { requireRehabilitationAccess(rehab, authentication); }
    private void requireMutationAccess(RehabilitationCase rehab, Authentication authentication) { requireRehabilitationAccess(rehab, authentication); }
    private void requireRehabilitationAccess(RehabilitationCase rehab, Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return;
        if (hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "NGO_OFFICIAL")) {
            Long currentUserId = userId(authentication);
            if (currentUserId.equals(rehab.getAssignedCounsellorId())) return;
            User currentUser = users.findById(currentUserId).orElse(null);
            if (currentUser != null && currentUser.getNgoOrganizationId() != null) {
                User counsellor = users.findById(rehab.getAssignedCounsellorId()).orElse(null);
                if (counsellor != null && currentUser.getNgoOrganizationId().equals(counsellor.getNgoOrganizationId())) return;
            }
        }
        throw forbidden("Rehabilitation case is not assigned to your NGO");
    }

    private void recordAudit(Authentication authentication, String action, String targetEntity, Long targetId, String details) {
        AuditLog log = new AuditLog();
        log.setAdminUserId(userId(authentication));
        log.setActorRole(authentication.getAuthorities().stream().map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("UNKNOWN"));
        log.setAction(action);
        log.setTargetEntity(targetEntity);
        log.setTargetId(targetId);
        log.setAfterState(details);
        audit.save(log);
    }
    private void changeStatus(CaseReport report, CaseStatus next, String remarks, Authentication authentication, Long recipient) {
        CaseStatus previous = report.getStatus(); transitions.validate(previous, next, remarks); report.setStatus(next); reports.save(report);
        CaseInvestigationLog log = new CaseInvestigationLog(); log.setCaseReportId(report.getId()); log.setUpdatedByUserId(userId(authentication)); log.setPreviousStatus(previous); log.setNewStatus(next); log.setRemarks(remarks); investigationLogs.save(log);
        recordStatusHistory(report, previous, next, authentication, remarks);
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(), previous, next, userId(authentication), recipient, report.getUrgencyLevel(), remarks));
    }
    private void notifyProgress(CaseReport report, Authentication authentication, String remarks) {
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(), report.getStatus(), report.getStatus(), userId(authentication), null, report.getUrgencyLevel(), remarks));
    }
    private void recordStatusHistory(CaseReport report, CaseStatus oldStatus, CaseStatus newStatus, Authentication authentication, String details) {
        CaseStatusHistory item = new CaseStatusHistory(); item.setCaseReportId(report.getId()); item.setOldStatus(oldStatus); item.setNewStatus(newStatus);
        item.setActorUserId(userId(authentication)); item.setActorRole(authentication.getAuthorities().stream().map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("UNKNOWN")); item.setDetails(details); statusHistory.save(item);
    }
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
