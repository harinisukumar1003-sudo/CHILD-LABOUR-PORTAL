package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.repository.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;
import static com.clrms.util.InputSanitizer.clean;

@Service
public class CaseManagementService {
    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;
    private final CaseInvestigationLogRepository logs;
    private final CaseStatusTransitionService transitions;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository users;
    private final CaseStatusHistoryRepository statusHistory;
    private final RehabilitationCaseRepository rehabilitationCases;
    private final FileStorageService storage;
    private final CaseOfficerVerificationRepository verifications;
    private final AuditLogRepository auditLogs;
    private final OfficerProfileRepository officerProfiles;
    private final NgoOrganizationRepository ngoOrganizations;

    public CaseManagementService(CaseReportRepository reports, CaseAssignmentRepository assignments,
                                 CaseInvestigationLogRepository logs, CaseStatusTransitionService transitions,
                                 ApplicationEventPublisher eventPublisher, UserRepository users,
                                 CaseStatusHistoryRepository statusHistory, RehabilitationCaseRepository rehabilitationCases,
                                 FileStorageService storage, CaseOfficerVerificationRepository verifications,
                                 AuditLogRepository auditLogs, OfficerProfileRepository officerProfiles,
                                 NgoOrganizationRepository ngoOrganizations) {
        this.reports = reports;
        this.assignments = assignments;
        this.logs = logs;
        this.transitions = transitions;
        this.eventPublisher = eventPublisher;
        this.users = users;
        this.statusHistory = statusHistory;
        this.rehabilitationCases = rehabilitationCases;
        this.storage = storage;
        this.verifications = verifications;
        this.auditLogs = auditLogs;
        this.officerProfiles = officerProfiles;
        this.ngoOrganizations = ngoOrganizations;
    }

    @Transactional
    public CaseAssignmentResponse assign(Long caseId, CaseAssignmentRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireRole(authentication, "ADMIN");
        User officer = users.findById(request.getAssignedOfficerId())
                .orElseThrow(() -> new IllegalArgumentException("Officer not found"));
        if (officer.getRole() != UserRole.OFFICER || officer.getStatus() != UserStatus.ACTIVE)
            throw new IllegalArgumentException("Choose an active officer account");

        if (report.getStatus() != CaseStatus.REPORTED && report.getStatus() != CaseStatus.UNDER_REVIEW && report.getStatus() != CaseStatus.ASSIGNED_TO_OFFICER)
            throw new IllegalArgumentException("Cases can only be assigned or reassigned before investigation begins");

        CaseAssignment assignment = new CaseAssignment();
        assignment.setCaseReportId(caseId);
        assignment.setAssignedOfficerId(request.getAssignedOfficerId());
        assignment.setAssignedByAdminId(userId(authentication));
        assignment.setJurisdiction(request.getJurisdiction().trim());
        assignment.setNotes(request.getNotes());
        CaseAssignmentResponse response = CaseAssignmentResponse.from(assignments.save(assignment));

        eventPublisher.publishEvent(new CaseAssignedEvent(assignment, caseId, report.getCaseNumber(),
                assignment.getAssignedOfficerId(), assignment.getAssignedByAdminId(), report.getUrgencyLevel()));

        if (report.getStatus() == CaseStatus.REPORTED || report.getStatus() == CaseStatus.UNDER_REVIEW) {
            CaseStatus prev = report.getStatus();
            updateStatus(report, CaseStatus.ASSIGNED_TO_OFFICER, "Case assigned to officer " + request.getAssignedOfficerId(), null, authentication);
            recordStatusHistory(caseId, prev, CaseStatus.ASSIGNED_TO_OFFICER, authentication,
                    "Assigned to officer " + request.getAssignedOfficerId() + " (" + officer.getName() + ")");
            recordAudit(authentication, "ASSIGN_OFFICER", "CaseReport", caseId,
                    "Assigned to officer " + officer.getName() + " (" + officer.getEmail() + ")");
        } else {
            saveLog(report, authentication, report.getStatus(), report.getStatus(),
                    "Case reassigned to officer " + request.getAssignedOfficerId(), null);
            recordStatusHistory(report.getId(), report.getStatus(), report.getStatus(), authentication,
                    "Case reassigned to officer " + request.getAssignedOfficerId() + " (" + officer.getName() + ")");
            recordAudit(authentication, "REASSIGN_OFFICER", "CaseReport", caseId,
                    "Reassigned to officer " + officer.getName());
        }
        return response;
    }

    @Transactional
    public OfficerVerificationResponse submitVerification(Long caseId, OfficerVerificationRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireRole(authentication, "OFFICER");
        checkAccess(report, authentication);

        if (request.getVisitDate() == null || blank(request.getObservations())
                || blank(request.getVerificationResult()) || request.getChildFound() == null
                || request.getAgeConfirmed() == null || request.getWorkActivityObserved() == null
                || request.getEmployerIdentified() == null || request.getChildInDanger() == null
                || request.getGuardianMet() == null || blank(request.getActionTaken())
                || !"I personally visited".equalsIgnoreCase(request.getDeclaration() != null ? request.getDeclaration().trim() : "")) {
            throw new IllegalArgumentException("In-person verification requires visit details, full 6-item checklist, action taken, and the declaration 'I personally visited'");
        }

        CaseOfficerVerification verif = new CaseOfficerVerification();
        verif.setCaseReportId(caseId);
        verif.setOfficerUserId(userId(authentication));
        verif.setVisitDate(request.getVisitDate());
        verif.setOutcome(clean(request.getOutcome()));
        verif.setObservations(clean(request.getObservations()));
        verif.setVerificationResult(clean(request.getVerificationResult()));
        verif.setChildFound(request.getChildFound());
        verif.setAgeConfirmed(request.getAgeConfirmed());
        verif.setWorkActivityObserved(request.getWorkActivityObserved());
        verif.setEmployerIdentified(request.getEmployerIdentified());
        verif.setChildInDanger(request.getChildInDanger());
        verif.setGuardianMet(request.getGuardianMet());
        verif.setPhotoUrl(clean(request.getPhotoUrl()));
        verif.setActionTaken(clean(request.getActionTaken()));
        verif.setFollowUpDate(request.getFollowUpDate());
        verif.setRemarks(clean(request.getRemarks()));
        verif.setDeclaration("I personally visited");
        verif.setRecommendation(clean(request.getRecommendation()));
        CaseOfficerVerification savedVerif = verifications.save(verif);

        // Determine next status
        CaseStatus nextStatus = CaseStatus.INVESTIGATION_COMPLETED;
        String recommendation = request.getRecommendation();
        if ("INVALID_COMPLAINT".equalsIgnoreCase(recommendation)) {
            nextStatus = CaseStatus.INVALID_COMPLAINT;
        } else if ("REHABILITATION_REFERRED".equalsIgnoreCase(recommendation)) {
            nextStatus = CaseStatus.REHABILITATION_REFERRED;
        }

        CaseStatus prevStatus = report.getStatus();
        CaseInvestigationLog log = updateStatus(report, nextStatus,
                "In-person verification submitted: " + request.getVerificationResult() + ". Recommendation: " + (recommendation != null ? recommendation : "INVESTIGATION_COMPLETED"),
                request.getPhotoUrl(), authentication);
        copyVerificationFields(request, log);
        logs.save(log);

        recordStatusHistory(caseId, prevStatus, nextStatus, authentication,
                "In-person verification submitted: " + request.getVerificationResult() + "; visit=" + request.getVisitDate() + "; recommendation=" + recommendation);
        recordAudit(authentication, "SUBMIT_VERIFICATION", "CaseOfficerVerification", savedVerif.getId(),
                "In-person visit recorded for case " + report.getCaseNumber() + " with result: " + request.getVerificationResult());

        return OfficerVerificationResponse.from(savedVerif);
    }

    @Transactional(readOnly = true)
    public OfficerVerificationResponse getVerification(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);
        return verifications.findFirstByCaseReportIdOrderByCreatedAtDesc(caseId)
                .map(OfficerVerificationResponse::from)
                .orElse(null);
    }

    @Transactional
    public CaseInvestigationLogResponse updateStatus(Long caseId, CaseStatusUpdateRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);

        if (hasRole(authentication, "OFFICER") && !Set.of(CaseStatus.INVESTIGATING, CaseStatus.INVESTIGATION_COMPLETED,
                CaseStatus.INVALID_COMPLAINT, CaseStatus.REHABILITATION_REFERRED).contains(request.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Officers cannot set this case status");

        if ((hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "NGO_OFFICIAL")) && !hasRole(authentication, "ADMIN") && !hasRole(authentication, "OFFICER")
                && !Set.of(CaseStatus.REHABILITATION_IN_PROGRESS, CaseStatus.REHABILITATION_COMPLETED).contains(request.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "NGO staff cannot set this case status");

        if (hasRole(authentication, "ADMIN") && !Set.of(CaseStatus.UNDER_REVIEW, CaseStatus.ASSIGNED_TO_OFFICER, CaseStatus.REJECTED, CaseStatus.CLOSED).contains(request.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Administrators cannot set this case status directly");

        if (request.getStatus() == CaseStatus.INVESTIGATION_COMPLETED) {
            validateVerification(report, request, userId(authentication));
        }

        if (request.getStatus() == CaseStatus.REHABILITATION_REFERRED) {
            boolean hasVerif = verifications.existsByCaseReportId(caseId)
                    || logs.findByCaseReportIdOrderByCreatedAtAsc(caseId).stream()
                    .anyMatch(l -> "I personally visited".equalsIgnoreCase(l.getDeclaration()));
            if (!hasVerif) {
                throw new IllegalArgumentException("In-person verification visit must be submitted before completing investigation or referring to rehabilitation");
            }
        }

        CaseInvestigationLog saved = updateStatus(report, request.getStatus(), request.getRemarks(), request.getAttachmentUrl(), authentication);
        copyVerification(request, saved);
        logs.save(saved);

        recordStatusHistory(caseId, saved.getPreviousStatus(), saved.getNewStatus(), authentication,
                request.getStatus() == CaseStatus.INVESTIGATION_COMPLETED ? "In-person verification: " + request.getVerificationResult() + "; visit=" + request.getVisitDate() : request.getRemarks());
        recordAudit(authentication, "UPDATE_STATUS", "CaseReport", caseId,
                "Case " + report.getCaseNumber() + " transitioned from " + saved.getPreviousStatus() + " to " + saved.getNewStatus());

        return CaseInvestigationLogResponse.from(saved);
    }

    @Transactional
    public CaseReportResponse assignNgo(Long caseId, Long assignedNgoUserId, String notes, Authentication authentication) {
        requireRole(authentication, "ADMIN");
        CaseReport report = report(caseId);
        if (report.getStatus() != CaseStatus.REHABILITATION_REFERRED) {
            throw new IllegalArgumentException("NGO can only be assigned to a case when in REHABILITATION_REFERRED status");
        }
        User ngo = users.findById(assignedNgoUserId).orElseThrow(() -> new IllegalArgumentException("NGO official not found"));
        if ((ngo.getRole() != UserRole.NGO_STAFF && ngo.getRole() != UserRole.NGO_OFFICIAL) || ngo.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Choose an active NGO official account");
        }

        RehabilitationCase rehab = rehabilitationCases.findByCaseReportId(caseId).orElseGet(() -> {
            RehabilitationCase rc = new RehabilitationCase();
            rc.setCaseReportId(caseId);
            rc.setChildAlias(report.getChildName() != null ? report.getChildName() : "Protected Child");
            rc.setStartDate(LocalDate.now());
            rc.setCurrentPhase(RehabilitationPhase.MEDICAL_ASSESSMENT);
            rc.setRehabilitationCenterId(1L);
            return rc;
        });
        rehab.setAssignedCounsellorId(assignedNgoUserId);
        rehabilitationCases.save(rehab);

        CaseStatus prev = report.getStatus();
        transitions.validate(prev, CaseStatus.NGO_ASSIGNED, "NGO assigned to rehabilitation referral");
        report.setStatus(CaseStatus.NGO_ASSIGNED);
        reports.save(report);

        CaseInvestigationLog log = new CaseInvestigationLog();
        log.setCaseReportId(report.getId());
        log.setUpdatedByUserId(userId(authentication));
        log.setPreviousStatus(prev);
        log.setNewStatus(CaseStatus.NGO_ASSIGNED);
        log.setRemarks("NGO assigned: " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName()) + (notes != null && !notes.isBlank() ? " - " + notes : ""));
        logs.save(log);

        recordStatusHistory(caseId, prev, CaseStatus.NGO_ASSIGNED, authentication,
                "NGO assigned: " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName()));
        recordAudit(authentication, "ASSIGN_NGO", "CaseReport", caseId,
                "Assigned to NGO " + (ngo.getOrganization() != null ? ngo.getOrganization() : ngo.getName()));

        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(),
                prev, CaseStatus.NGO_ASSIGNED, userId(authentication), assignedNgoUserId, report.getUrgencyLevel(),
                "Assigned to rehabilitation"));

        return CaseReportResponse.from(report, false);
    }

    @Transactional
    public CaseReportResponse.EvidenceResponse uploadVisitPhoto(Long caseId, MultipartFile file, Authentication authentication) {
        CaseReport report = report(caseId);
        requireRole(authentication, "OFFICER");
        checkAccess(report, authentication);
        if (!EvidenceFileRules.isPhoto(file)) throw new IllegalArgumentException("Upload a JPEG, PNG, or WEBP visit photo");
        CaseEvidence evidence = new CaseEvidence();
        evidence.setCaseReport(report);
        evidence.setFileUrl(storage.store(file));
        evidence.setFileType(EvidenceFileRules.fileType(file));
        evidence.setUploadedBy(userId(authentication));
        report.getEvidence().add(evidence);
        reports.save(report);
        return new CaseReportResponse.EvidenceResponse(evidence.getId(), evidence.getFileUrl(), evidence.getFileType(), evidence.getUploadedAt(), evidence.getUploadedBy());
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
        Long officerId = userId(authentication);
        return assignments.findByAssignedOfficerIdOrderByAssignedAtDesc(officerId).stream()
                .filter(assignment -> assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(assignment.getCaseReportId())
                        .map(current -> current.getAssignedOfficerId().equals(officerId)).orElse(false))
                .map(assignment -> report(assignment.getCaseReportId()))
                .distinct()
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
        List<CaseReport> filtered = reports.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(report -> {
                    if (hasRole(authentication, "ADMIN")) return true;
                    if (hasRole(authentication, "OFFICER")) return isAssignedTo(report.getId(), userId(authentication));
                    if (hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "NGO_OFFICIAL")) {
                        Long currentUserId = userId(authentication);
                        User currentUser = users.findById(currentUserId).orElse(null);
                        return rehabilitationCases.findByCaseReportId(report.getId())
                                .map(rc -> {
                                    if (rc.getAssignedCounsellorId().equals(currentUserId)) return true;
                                    if (currentUser != null && currentUser.getNgoOrganizationId() != null) {
                                        User counsellor = users.findById(rc.getAssignedCounsellorId()).orElse(null);
                                        return counsellor != null && currentUser.getNgoOrganizationId().equals(counsellor.getNgoOrganizationId());
                                    }
                                    return false;
                                }).orElse(false);
                    }
                    return false;
                }).toList();
        return filtered.stream().map(report -> CaseReportResponse.from(report, false)).toList();
    }

    private CaseInvestigationLog updateStatus(CaseReport report, CaseStatus next, String remarks, String attachmentUrl, Authentication authentication) {
        transitions.validate(report.getStatus(), next, remarks);
        CaseStatus previous = report.getStatus();
        report.setStatus(next);
        reports.save(report);
        CaseInvestigationLog log = saveLog(report, authentication, previous, next, remarks, attachmentUrl);
        @SuppressWarnings("null")
        Long recipientUserId = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(report.getId())
                .map(CaseAssignment::getAssignedOfficerId).orElse(null);
        eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(),
                previous, next, userId(authentication), recipientUserId, report.getUrgencyLevel(), remarks));
        if (next == CaseStatus.CLOSED) {
            rehabilitationCases.findByCaseReportId(report.getId()).ifPresent(rehab ->
                    eventPublisher.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(),
                            previous, next, userId(authentication), rehab.getAssignedCounsellorId(), report.getUrgencyLevel(), "Case closed by Admin")));
            recordAudit(authentication, "CASE_CLOSED", "CaseReport", report.getId(), "Case " + report.getCaseNumber() + " closed by Admin");
        }
        return log;
    }

    private CaseInvestigationLog saveLog(CaseReport report, Authentication authentication, CaseStatus previous, CaseStatus next, String remarks, String attachmentUrl) {
        CaseInvestigationLog log = new CaseInvestigationLog();
        log.setCaseReportId(report.getId());
        log.setUpdatedByUserId(userId(authentication));
        log.setPreviousStatus(previous);
        log.setNewStatus(next);
        log.setRemarks(clean(remarks));
        log.setAttachmentUrl(clean(attachmentUrl));
        return logs.save(log);
    }

    private void validateVerification(CaseReport report, CaseStatusUpdateRequest request, Long officerId) {
        if (request.getVisitDate() == null || blank(request.getOutcome()) || blank(request.getObservations())
                || blank(request.getVerificationResult()) || request.getChildFound() == null || request.getAgeConfirmed() == null
                || request.getWorkActivityObserved() == null || request.getEmployerIdentified() == null || request.getChildInDanger() == null
                || request.getGuardianMet() == null || blank(request.getActionTaken()) || blank(request.getDeclaration())
                || !"I personally visited".equalsIgnoreCase(request.getDeclaration().trim())) {
            // Check if verification already exists in verifications table
            if (!verifications.existsByCaseReportId(report.getId())) {
                throw new IllegalArgumentException("In-person verification requires visit details, full checklist, action taken, and declaration 'I personally visited'");
            }
        }
    }

    private void copyVerification(CaseStatusUpdateRequest request, CaseInvestigationLog log) {
        if (request.getVisitDate() != null) log.setVisitDate(request.getVisitDate());
        if (request.getOutcome() != null) log.setOutcome(clean(request.getOutcome()));
        if (request.getObservations() != null) log.setObservations(clean(request.getObservations()));
        if (request.getVerificationResult() != null) log.setVerificationResult(clean(request.getVerificationResult()));
        if (request.getChildFound() != null) log.setChildFound(request.getChildFound());
        if (request.getAgeConfirmed() != null) log.setAgeConfirmed(request.getAgeConfirmed());
        if (request.getWorkActivityObserved() != null) log.setWorkActivityObserved(request.getWorkActivityObserved());
        if (request.getEmployerIdentified() != null) log.setEmployerIdentified(request.getEmployerIdentified());
        if (request.getChildInDanger() != null) log.setChildInDanger(request.getChildInDanger());
        if (request.getGuardianMet() != null) log.setGuardianMet(request.getGuardianMet());
        if (request.getActionTaken() != null) log.setActionTaken(clean(request.getActionTaken()));
        if (request.getFollowUpDate() != null) log.setFollowUpDate(request.getFollowUpDate());
        if (request.getDeclaration() != null) log.setDeclaration(clean(request.getDeclaration()));
    }

    private void copyVerificationFields(OfficerVerificationRequest req, CaseInvestigationLog log) {
        log.setVisitDate(req.getVisitDate());
        log.setOutcome(clean(req.getOutcome()));
        log.setObservations(clean(req.getObservations()));
        log.setVerificationResult(clean(req.getVerificationResult()));
        log.setChildFound(req.getChildFound());
        log.setAgeConfirmed(req.getAgeConfirmed());
        log.setWorkActivityObserved(req.getWorkActivityObserved());
        log.setEmployerIdentified(req.getEmployerIdentified());
        log.setChildInDanger(req.getChildInDanger());
        log.setGuardianMet(req.getGuardianMet());
        log.setActionTaken(clean(req.getActionTaken()));
        log.setFollowUpDate(req.getFollowUpDate());
        log.setDeclaration("I personally visited");
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }

    private void recordStatusHistory(Long caseId, CaseStatus oldStatus, CaseStatus newStatus, Authentication authentication, String details) {
        CaseStatusHistory item = new CaseStatusHistory();
        item.setCaseReportId(caseId);
        item.setOldStatus(oldStatus);
        item.setNewStatus(newStatus);
        item.setActorUserId(userId(authentication));
        item.setActorRole(authentication.getAuthorities().stream().map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("UNKNOWN"));
        item.setDetails(details);
        statusHistory.save(item);
    }

    private void recordAudit(Authentication authentication, String action, String targetEntity, Long targetId, String details) {
        AuditLog log = new AuditLog();
        log.setAdminUserId(userId(authentication));
        log.setActorRole(authentication.getAuthorities().stream().map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("UNKNOWN"));
        log.setAction(action);
        log.setTargetEntity(targetEntity);
        log.setTargetId(targetId);
        log.setAfterState(details);
        auditLogs.save(log);
    }

    private void checkAccess(CaseReport report, Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return;
        if (hasRole(authentication, "OFFICER")) {
            if (isAssignedTo(report.getId(), userId(authentication))) return;
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Case is not assigned to you");
        }
        if (hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "NGO_OFFICIAL")) {
            Long currentUserId = userId(authentication);
            User currentUser = users.findById(currentUserId).orElse(null);
            boolean allowed = rehabilitationCases.findByCaseReportId(report.getId())
                    .map(rc -> {
                        if (rc.getAssignedCounsellorId().equals(currentUserId)) return true;
                        if (currentUser != null && currentUser.getNgoOrganizationId() != null) {
                            User counsellor = users.findById(rc.getAssignedCounsellorId()).orElse(null);
                            return counsellor != null && currentUser.getNgoOrganizationId().equals(counsellor.getNgoOrganizationId());
                        }
                        return false;
                    }).orElse(false);
            if (allowed) return;
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Case is not assigned to your NGO");
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied to this case");
    }

    private boolean isAssignedTo(Long caseId, Long officerId) {
        CaseAssignment assignment = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(caseId).orElse(null);
        return assignment != null && assignment.getAssignedOfficerId().equals(officerId);
    }

    @SuppressWarnings("null")
    private CaseReport report(Long id) {
        return reports.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found"));
    }

    private void requireStaff(Authentication authentication) {
        if (!(hasRole(authentication, "OFFICER") || hasRole(authentication, "NGO_STAFF") || hasRole(authentication, "NGO_OFFICIAL") || hasRole(authentication, "ADMIN")))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private void requireRole(Authentication authentication, String role) {
        if (!hasRole(authentication, role))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private Long userId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (Exception ignored) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Authenticated user id is required");
        }
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role));
    }
}
