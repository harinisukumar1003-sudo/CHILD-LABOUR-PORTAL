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
    private static final Set<String> MANUAL_VERIFICATION_ITEMS = Set.of(
            "identityDetailsVerified", "locationVerified", "reporterContacted", "caseDetailsMatch");

    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;
    private final CaseAssignmentLogRepository assignmentLogs;
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
                                 CaseAssignmentLogRepository assignmentLogs, CaseInvestigationLogRepository logs,
                                 CaseStatusTransitionService transitions,
                                 ApplicationEventPublisher eventPublisher, UserRepository users,
                                 CaseStatusHistoryRepository statusHistory, RehabilitationCaseRepository rehabilitationCases,
                                 FileStorageService storage, CaseOfficerVerificationRepository verifications,
                                 AuditLogRepository auditLogs, OfficerProfileRepository officerProfiles,
                                 NgoOrganizationRepository ngoOrganizations) {
        this.reports = reports;
        this.assignments = assignments;
        this.assignmentLogs = assignmentLogs;
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
        return assign(caseId, request.getAssignedOfficerId(), request.getJurisdiction(), request.getNotes(), authentication);
    }

    @Transactional
    public CaseAssignmentResponse assign(Long caseId, CaseOfficerAssignmentRequest request, Authentication authentication) {
        return assign(caseId, request.officerId(), null, null, authentication);
    }

    @Transactional
    public CaseRehabilitationReferralResponse referToRehabilitation(
            Long caseId, CaseRehabilitationReferralRequest request, Authentication authentication) {
        if (!hasRole(authentication, "OFFICER") && !hasRole(authentication, "ADMIN"))
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the assigned officer or an administrator can refer this case");
        CaseReport report = report(caseId);
        checkAccess(report, authentication);
        if (report.getStatus() != CaseStatus.INVESTIGATION_COMPLETED)
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "A case must be Investigation Completed before it can be referred to Rehabilitation.");
        if (!report.isManualVerificationDone())
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Complete Manual Verification before referring the case.");

        NgoOrganization ngo = ngoOrganizations.findByIdForUpdate(request.ngoId())
                .orElseThrow(() -> new IllegalArgumentException("The selected NGO was not found."));
        if (!ngo.isActive())
            throw new IllegalArgumentException("Choose an active NGO.");
        if (ngo.getCapacity() == null || ngo.getAvailableBeds() == null
                || ngo.getAvailableBeds() <= 0 || ngo.getAvailableBeds() > ngo.getCapacity())
            throw new IllegalArgumentException("The selected NGO has no available rehabilitation capacity.");
        List<User> contacts = users.findByNgoOrganizationIdAndRoleInAndStatus(
                ngo.getId(), List.of(UserRole.NGO_OFFICIAL, UserRole.NGO_STAFF), UserStatus.ACTIVE);
        if (contacts.isEmpty())
            throw new IllegalArgumentException("The selected NGO has no active official who can receive this referral.");

        ngo.setAvailableBeds(ngo.getAvailableBeds() - 1);
        ngoOrganizations.save(ngo);
        CaseStatus previousStatus = report.getStatus();
        report.setAssignedNgoId(ngo.getId());
        report.setReferredAt(java.time.Instant.now());
        report.setReferralNote(clean(request.note().trim()));
        report.setRehabilitationAcceptedBy(null);
        report.setRehabilitationAcceptedAt(null);
        report.setStatus(CaseStatus.REHABILITATION_REFERRED);
        reports.save(report);
        saveLog(report, authentication, previousStatus, CaseStatus.REHABILITATION_REFERRED,
                "Case referred to rehabilitation", null);
        recordStatusHistory(caseId, previousStatus, CaseStatus.REHABILITATION_REFERRED,
                authentication, "Referred to rehabilitation", clean(request.note().trim()),
                null, null, null, null, null);
        recordAudit(authentication, "REFER_REHABILITATION", "CaseReport", caseId,
                "Case referred to an active rehabilitation organization");
        eventPublisher.publishEvent(new NgoReferralCreatedEvent(report.getId(),
                report.getCaseNumber(), contacts.stream().map(User::getId).toList(),
                report.getUrgencyLevel()));
        return CaseRehabilitationReferralResponse.from(report, ngo.getName());
    }

    private CaseAssignmentResponse assign(Long caseId, Long officerId, String jurisdiction, String notes,
                                          Authentication authentication) {
        requireRole(authentication, "ADMIN");
        CaseReport report = report(caseId);
        User officer = users.findById(officerId)
                .orElseThrow(() -> new IllegalArgumentException("Officer not found"));
        if (officer.getRole() != UserRole.OFFICER || officer.getStatus() != UserStatus.ACTIVE)
            throw new IllegalArgumentException("Choose an active officer account");

        if (report.getStatus() != CaseStatus.UNDER_REVIEW && report.getStatus() != CaseStatus.ASSIGNED_TO_OFFICER)
            throw new IllegalArgumentException("Move the case to Under Review before assigning an officer.");

        Long previousOfficerId = report.getAssignedOfficerId();
        CaseAssignment previousAssignment = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(caseId).orElse(null);
        if (previousOfficerId == null && previousAssignment != null) {
            previousOfficerId = previousAssignment.getAssignedOfficerId();
        }

        CaseAssignment assignment = new CaseAssignment();
        assignment.setCaseReportId(caseId);
        assignment.setAssignedOfficerId(officerId);
        assignment.setAssignedByAdminId(userId(authentication));
        assignment.setJurisdiction(jurisdiction == null || jurisdiction.isBlank()
                ? (report.getDistrict() == null || report.getDistrict().isBlank() ? "Unspecified" : report.getDistrict())
                : jurisdiction.trim());
        assignment.setNotes(notes);
        CaseAssignment savedAssignment = assignments.save(assignment);
        CaseAssignmentResponse response = CaseAssignmentResponse.from(savedAssignment);

        report.setAssignedOfficerId(officerId);
        report.setAssignedAt(savedAssignment.getAssignedAt() == null ? java.time.Instant.now() : savedAssignment.getAssignedAt());
        reports.save(report);

        CaseAssignmentLog assignmentLog = new CaseAssignmentLog();
        assignmentLog.setCaseId(caseId);
        assignmentLog.setFromOfficerId(previousOfficerId);
        assignmentLog.setToOfficerId(officerId);
        assignmentLog.setAssignedBy(userId(authentication));
        assignmentLogs.save(assignmentLog);

        eventPublisher.publishEvent(new CaseAssignedEvent(savedAssignment, caseId, report.getCaseNumber(),
                officerId, userId(authentication), report.getUrgencyLevel(),
                previousOfficerId != null && !previousOfficerId.equals(officerId) ? previousOfficerId : null));

        if (report.getStatus() == CaseStatus.REPORTED || report.getStatus() == CaseStatus.UNDER_REVIEW) {
            CaseStatus prev = report.getStatus();
            updateStatus(report, CaseStatus.ASSIGNED_TO_OFFICER, "Case assigned to an officer", null, authentication);
            recordStatusHistory(caseId, prev, CaseStatus.ASSIGNED_TO_OFFICER, authentication,
                    "Assigned officer ID " + officerId);
            recordAudit(authentication, "ASSIGN_OFFICER", "CaseReport", caseId,
                    "Officer assignment created");
        } else {
            saveLog(report, authentication, report.getStatus(), report.getStatus(),
                    "Case reassigned to an officer", null);
            recordStatusHistory(report.getId(), report.getStatus(), report.getStatus(), authentication,
                    "Case reassigned to officer ID " + officerId);
            recordAudit(authentication, "REASSIGN_OFFICER", "CaseReport", caseId,
                    "Officer assignment changed");
        }
        return response;
    }

    @Transactional
    public OfficerVerificationResponse submitVerification(Long caseId, OfficerVerificationRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireRole(authentication, "OFFICER");
        checkAccess(report, authentication);
        if (report.getStatus() != CaseStatus.INVESTIGATING)
            throw new IllegalArgumentException("Complete the required status steps before submitting an investigation visit.");
        if (!report.isManualVerificationDone())
            throw new IllegalArgumentException("Complete manual verification before submitting an investigation visit.");

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
        String recommendation = request.getRecommendation();
        if (recommendation != null && !recommendation.isBlank()
                && !"INVESTIGATION_COMPLETED".equalsIgnoreCase(recommendation)) {
            throw new IllegalArgumentException("Investigation must be completed before selecting a rehabilitation or invalid-case outcome.");
        }

        CaseStatus prevStatus = report.getStatus();
        CaseInvestigationLog log = updateStatus(report, CaseStatus.INVESTIGATION_COMPLETED,
                "In-person verification submitted: " + request.getVerificationResult() + ". Recommendation: " + (recommendation != null ? recommendation : "INVESTIGATION_COMPLETED"),
                request.getPhotoUrl(), authentication);
        copyVerificationFields(request, log);
        logs.save(log);

        recordStatusHistory(caseId, prevStatus, CaseStatus.INVESTIGATION_COMPLETED, authentication,
                "Investigation verification submitted");
        recordAudit(authentication, "SUBMIT_VERIFICATION", "CaseOfficerVerification", savedVerif.getId(),
                "Investigation verification submitted");

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
        if (!hasRole(authentication, "OFFICER") && !hasRole(authentication, "ADMIN"))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only the assigned officer or an administrator can change this case status");
        checkAccess(report, authentication);

        if (hasRole(authentication, "OFFICER") && !Set.of(CaseStatus.INVESTIGATING,
                CaseStatus.INVESTIGATION_COMPLETED).contains(request.getStatus()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Officers cannot set this case status");
        if (request.getStatus() == CaseStatus.ASSIGNED_TO_OFFICER)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Assign an active officer using the assignment action before setting this status.");
        if (Set.of(CaseStatus.REHABILITATION_REFERRED, CaseStatus.REHABILITATION_ACCEPTED,
                CaseStatus.ADMITTED_TO_CENTRE, CaseStatus.IN_REHABILITATION,
                CaseStatus.REINTEGRATED).contains(request.getStatus())
                || request.getStatus() == CaseStatus.CLOSED && report.getAssignedNgoId() != null)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Use the rehabilitation referral and NGO stage actions to update this case.");

        if (request.getStatus() == CaseStatus.INVESTIGATING && !report.isManualVerificationDone())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Complete Manual Verification before starting the investigation.");
        if ((request.getStatus() == CaseStatus.INVESTIGATION_COMPLETED
                || request.getStatus() == CaseStatus.REHABILITATION_REFERRED) && !report.isManualVerificationDone())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Complete Manual Verification before progressing this case.");
        if (request.getStatus() == CaseStatus.INVESTIGATION_COMPLETED
                && !hasRole(authentication, "ADMIN") && !verifications.existsByCaseReportId(caseId))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Submit the required in-person investigation verification before completing the investigation.");

        CaseInvestigationLog saved = updateStatus(report, request.getStatus(), request.getRemarks(), request.getAttachmentUrl(), authentication);
        copyVerification(request, saved);
        logs.save(saved);

        recordStatusHistory(caseId, saved.getPreviousStatus(), saved.getNewStatus(), authentication,
                "Status updated to " + request.getStatus());
        recordAudit(authentication, "UPDATE_STATUS", "CaseReport", caseId,
                "Case status transitioned from " + saved.getPreviousStatus() + " to " + saved.getNewStatus());

        return CaseInvestigationLogResponse.from(saved);
    }

    @Transactional
    public CaseRehabilitationReferralResponse assignNgo(Long caseId, Long assignedNgoUserId,
                                                         String notes, Authentication authentication) {
        requireRole(authentication, "ADMIN");
        User ngo = users.findById(assignedNgoUserId).orElseThrow(() -> new IllegalArgumentException("NGO official not found"));
        if ((ngo.getRole() != UserRole.NGO_STAFF && ngo.getRole() != UserRole.NGO_OFFICIAL) || ngo.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Choose an active NGO official account");
        }
        if (ngo.getNgoOrganizationId() == null)
            throw new IllegalArgumentException("The selected NGO official is not linked to an NGO.");
        if (notes == null || notes.isBlank())
            throw new IllegalArgumentException("A referral note is required.");
        return referToRehabilitation(caseId,
                new CaseRehabilitationReferralRequest(ngo.getNgoOrganizationId(), notes), authentication);
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
        return reports.findByAssignedOfficerIdOrderByAssignedAtDesc(officerId).stream()
                .map(this::caseResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CaseStatusHistoryResponse> statusHistory(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireStaff(authentication);
        checkAccess(report, authentication);
        return statusHistory.findByCaseReportIdOrderByCreatedAtAscIdAsc(caseId).stream()
                .map(item -> new CaseStatusHistoryResponse(item.getId(), item.getOldStatus(), item.getNewStatus(),
                        item.getActorUserId(), item.getActorUserId() == null ? null
                        : users.findById(item.getActorUserId()).map(User::getName).orElse(null),
                        item.getActorRole(), item.getCreatedAt(), item.getDetails(), item.getProgressNote(),
                        item.getCenterId(), item.getAdmissionDate(), item.getEducationUpdate(),
                        item.getHealthUpdate(), item.getCounsellingUpdate()))
                .toList();
    }

    @Transactional(readOnly = true)
    public CaseReportResponse.ManualVerificationDetails manualVerification(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireManualVerificationAccess(report, authentication);
        String verifierName = report.getManualVerifiedBy() == null ? null
                : users.findById(report.getManualVerifiedBy()).map(User::getName).orElse(null);
        return new CaseReportResponse.ManualVerificationDetails(report.isManualVerificationDone(),
                report.getManualVerifiedBy(), verifierName, report.getManualVerifiedAt(),
                report.getManualVerificationChecklist(), report.getManualVerificationNotes());
    }

    @Transactional
    public CaseReportResponse.ManualVerificationDetails markManualVerificationDone(
            Long caseId, ManualVerificationRequest request, Authentication authentication) {
        CaseReport report = report(caseId);
        requireManualVerificationAccess(report, authentication);
        if (report.getStatus() != CaseStatus.ASSIGNED_TO_OFFICER)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Manual Verification is available after this case is assigned and before investigation starts.");
        if (report.isManualVerificationDone())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Manual Verification is already complete. Contact an administrator if it needs correction.");
        if (request.checklist() == null || !request.checklist().keySet().equals(MANUAL_VERIFICATION_ITEMS)
                || request.checklist().values().stream().anyMatch(value -> !Boolean.TRUE.equals(value)))
            throw new IllegalArgumentException("Complete every Manual Verification checklist item before submitting.");

        report.setManualVerificationDone(true);
        report.setManualVerifiedBy(userId(authentication));
        report.setManualVerifiedAt(java.time.Instant.now());
        report.setManualVerificationChecklist(new LinkedHashMap<>(request.checklist()));
        report.setManualVerificationNotes(clean(request.notes().trim()));
        reports.save(report);
        recordAudit(authentication, "MANUAL_VERIFICATION_COMPLETED", "CaseReport", caseId,
                "Manual verification completed");
        recordStatusHistory(caseId, report.getStatus(), report.getStatus(), authentication,
                "Manual verification completed");
        return manualVerification(caseId, authentication);
    }

    @Transactional
    public CaseReportResponse.ManualVerificationDetails resetManualVerification(
            Long caseId, ManualVerificationResetRequest request, Authentication authentication) {
        requireRole(authentication, "ADMIN");
        if (request == null || request.reason() == null || request.reason().isBlank())
            throw new IllegalArgumentException("A reason is required to reset Manual Verification.");
        CaseReport report = report(caseId);
        if (!report.isManualVerificationDone())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Manual Verification is not currently complete.");
        report.setManualVerificationDone(false);
        report.setManualVerifiedBy(null);
        report.setManualVerifiedAt(null);
        report.setManualVerificationChecklist(null);
        report.setManualVerificationNotes(null);
        reports.save(report);
        recordAudit(authentication, "MANUAL_VERIFICATION_RESET", "CaseReport", caseId,
                "Manual verification reset by an administrator");
        recordStatusHistory(caseId, report.getStatus(), report.getStatus(), authentication,
                "Manual verification reset by an administrator");
        return manualVerification(caseId, authentication);
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
        if (hasRole(authentication, "OFFICER"))
            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("assignedOfficerId"), userId(authentication)));
        if (keyword != null && !keyword.isBlank()) specification = specification.and((root, query, cb) -> {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(cb.like(cb.lower(root.get("caseNumber")), pattern), cb.like(cb.lower(root.get("incidentDescription")), pattern), cb.like(cb.lower(root.get("locationAddress")), pattern));
        });
        List<CaseReport> filtered = reports.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(report -> {
                    if (hasRole(authentication, "ADMIN")) return true;
                    if (hasRole(authentication, "OFFICER")) return true;
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
        return filtered.stream().map(this::caseResponse).toList();
    }

    private CaseReportResponse caseResponse(CaseReport report) {
        String officerName = report.getAssignedOfficerId() == null ? null
                : users.findById(report.getAssignedOfficerId()).map(User::getName).orElse(null);
        String verifierName = report.getManualVerifiedBy() == null ? null
                : users.findById(report.getManualVerifiedBy()).map(User::getName).orElse(null);
        return CaseReportResponse.from(report, false, officerName, verifierName);
    }

    private CaseInvestigationLog updateStatus(CaseReport report, CaseStatus next, String remarks, String attachmentUrl, Authentication authentication) {
        transitions.validate(report.getStatus(), next, remarks, hasRole(authentication, "ADMIN"));
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
        recordStatusHistory(caseId, oldStatus, newStatus, authentication, details,
                null, null, null, null, null, null);
    }

    private void recordStatusHistory(Long caseId, CaseStatus oldStatus, CaseStatus newStatus,
                                     Authentication authentication, String details, String progressNote,
                                     Long centerId, java.time.LocalDate admissionDate, String educationUpdate,
                                     String healthUpdate, String counsellingUpdate) {
        CaseStatusHistory item = new CaseStatusHistory();
        item.setCaseReportId(caseId);
        item.setOldStatus(oldStatus);
        item.setNewStatus(newStatus);
        item.setActorUserId(userId(authentication));
        item.setActorRole(authentication.getAuthorities().stream().map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("UNKNOWN"));
        item.setDetails(details);
        item.setProgressNote(progressNote);
        item.setCenterId(centerId);
        item.setAdmissionDate(admissionDate);
        item.setEducationUpdate(educationUpdate);
        item.setHealthUpdate(healthUpdate);
        item.setCounsellingUpdate(counsellingUpdate);
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
        return reports.findById(caseId)
                .map(report -> Objects.equals(report.getAssignedOfficerId(), officerId))
                .orElse(false);
    }

    private void requireManualVerificationAccess(CaseReport report, Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return;
        if (hasRole(authentication, "OFFICER")) {
            checkAccess(report, authentication);
            return;
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,
                "Only the assigned officer or an administrator can access Manual Verification");
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
