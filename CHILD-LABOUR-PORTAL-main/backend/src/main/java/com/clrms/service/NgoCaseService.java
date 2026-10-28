package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.*;
import com.clrms.repository.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static com.clrms.util.InputSanitizer.clean;

@Service
public class NgoCaseService {
    private static final Set<CaseStatus> NGO_STAGES = EnumSet.of(
            CaseStatus.REHABILITATION_ACCEPTED, CaseStatus.ADMITTED_TO_CENTRE,
            CaseStatus.IN_REHABILITATION, CaseStatus.REINTEGRATED, CaseStatus.CLOSED);

    private final CaseReportRepository reports;
    private final NgoOrganizationRepository organizations;
    private final UserRepository users;
    private final RehabilitationCenterRepository centers;
    private final CaseStatusHistoryRepository history;
    private final CaseStatusTransitionService transitions;
    private final ApplicationEventPublisher events;
    private final AuditLogRepository audit;

    public NgoCaseService(CaseReportRepository reports, NgoOrganizationRepository organizations,
                          UserRepository users, RehabilitationCenterRepository centers,
                          CaseStatusHistoryRepository history, CaseStatusTransitionService transitions,
                          ApplicationEventPublisher events, AuditLogRepository audit) {
        this.reports = reports;
        this.organizations = organizations;
        this.users = users;
        this.centers = centers;
        this.history = history;
        this.transitions = transitions;
        this.events = events;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<NgoCaseResponse> myCases(Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) {
            return reports.findAll(Sort.by(Sort.Direction.DESC, "referredAt")).stream()
                    .filter(report -> report.getAssignedNgoId() != null)
                    .map(this::response)
                    .toList();
        }
        Long ngoId = authenticatedNgoId(authentication);
        return reports.findByAssignedNgoIdOrderByReferredAtDesc(ngoId).stream()
                .map(this::response)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NgoReferralOptionResponse> referralOptions(Authentication authentication) {
        requireOfficerOrAdmin(authentication);
        return organizations.findByActiveTrueOrderByNameAsc().stream()
                .map(NgoReferralOptionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CaseStatusHistoryResponse> statusHistory(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireCaseAccess(report, authentication);
        return history.findByCaseReportIdOrderByCreatedAtAscIdAsc(caseId).stream()
                .filter(this::isRehabilitationHistory)
                .map(item -> new CaseStatusHistoryResponse(item.getId(), item.getOldStatus(),
                        item.getNewStatus(), item.getActorUserId(),
                        item.getActorUserId() == null ? null : users.findById(item.getActorUserId())
                                .map(User::getName).orElse(null),
                        item.getActorRole(), item.getCreatedAt(), null, item.getProgressNote(),
                        item.getCenterId(), item.getAdmissionDate(), item.getEducationUpdate(),
                        item.getHealthUpdate(), item.getCounsellingUpdate()))
                .toList();
    }

    @Transactional
    public NgoCaseResponse accept(Long caseId, Authentication authentication) {
        CaseReport report = report(caseId);
        requireCaseAccess(report, authentication);
        if (report.getStatus() != CaseStatus.REHABILITATION_REFERRED)
            throw bad("This case is not awaiting an NGO decision.");
        CaseStatus previous = report.getStatus();
        transitions.validate(previous, CaseStatus.REHABILITATION_ACCEPTED, "Referral accepted");
        report.setStatus(CaseStatus.REHABILITATION_ACCEPTED);
        report.setRehabilitationAcceptedBy(userId(authentication));
        report.setRehabilitationAcceptedAt(Instant.now());
        reports.save(report);
        recordHistory(report, previous, CaseStatus.REHABILITATION_ACCEPTED,
                authentication, "Rehabilitation referral accepted", "Referral accepted by the NGO.");
        notifyStage(report, previous, CaseStatus.REHABILITATION_ACCEPTED, authentication);
        recordAudit(authentication, "ACCEPT_REHABILITATION_REFERRAL", caseId,
                "Rehabilitation referral accepted");
        return response(report);
    }

    @Transactional
    public NgoCaseResponse reject(Long caseId, NgoCaseRejectionRequest request,
                                  Authentication authentication) {
        CaseReport report = report(caseId);
        requireCaseAccess(report, authentication);
        if (report.getStatus() != CaseStatus.REHABILITATION_REFERRED)
            throw bad("Only a new rehabilitation referral can be rejected.");
        NgoOrganization organization = assignedOrganization(report);
        CaseStatus previous = report.getStatus();
        String reason = clean(request.reason().trim());
        report.setStatus(CaseStatus.INVESTIGATION_COMPLETED);
        report.setAssignedNgoId(null);
        report.setReferredAt(null);
        report.setReferralNote(null);
        report.setRehabilitationAcceptedBy(null);
        report.setRehabilitationAcceptedAt(null);
        if (organization.getAvailableBeds() != null && organization.getCapacity() != null
                && organization.getAvailableBeds() < organization.getCapacity())
            organization.setAvailableBeds(organization.getAvailableBeds() + 1);
        organizations.save(organization);
        reports.save(report);
        recordHistory(report, previous, CaseStatus.INVESTIGATION_COMPLETED,
                authentication, "Rehabilitation referral rejected", reason);
        notifyStage(report, previous, CaseStatus.INVESTIGATION_COMPLETED, authentication);
        recordAudit(authentication, "REJECT_REHABILITATION_REFERRAL", caseId,
                "Rehabilitation referral rejected; reason recorded in case history");
        return response(report);
    }

    @Transactional
    public NgoCaseResponse advance(Long caseId, NgoRehabilitationStageRequest request,
                                   Authentication authentication) {
        CaseReport report = report(caseId);
        requireCaseAccess(report, authentication);
        if (!NGO_STAGES.contains(request.status()))
            throw bad("Choose a rehabilitation stage.");
        CaseStatus previous = report.getStatus();
        if (previous == request.status())
            throw bad("The case is already at this rehabilitation stage.");

        RehabilitationCenter center = null;
        if (request.centerId() != null) {
            center = centers.findById(request.centerId())
                    .orElseThrow(() -> bad("The selected rehabilitation centre was not found."));
        }
        boolean admin = hasRole(authentication, "ADMIN");
        try {
            transitions.validate(previous, request.status(), request.progressNote(), admin);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    exception.getMessage());
        }

        NgoOrganization organization = assignedOrganization(report);
        if (previous == CaseStatus.CLOSED && request.status() != CaseStatus.CLOSED) {
            if (organization.getAvailableBeds() == null || organization.getAvailableBeds() <= 0)
                throw bad("The assigned NGO has no capacity to reopen this rehabilitation case.");
            organization.setAvailableBeds(organization.getAvailableBeds() - 1);
        } else if (previous != CaseStatus.CLOSED && request.status() == CaseStatus.CLOSED
                && organization.getAvailableBeds() != null && organization.getCapacity() != null
                && organization.getAvailableBeds() < organization.getCapacity()) {
            organization.setAvailableBeds(organization.getAvailableBeds() + 1);
        }
        organizations.save(organization);
        report.setStatus(request.status());
        reports.save(report);
        String progressNote = clean(request.progressNote().trim());
        recordHistory(report, previous, request.status(), authentication,
                "Rehabilitation stage updated", progressNote,
                center == null ? null : center.getId(), request.admissionDate(),
                clean(request.educationUpdate()), clean(request.healthUpdate()),
                clean(request.counsellingUpdate()));
        notifyStage(report, previous, request.status(), authentication);
        recordAudit(authentication, "UPDATE_REHABILITATION_STAGE", caseId,
                "Rehabilitation stage changed from " + previous + " to " + request.status());
        return response(report);
    }

    private boolean isRehabilitationHistory(CaseStatusHistory item) {
        return item.getNewStatus() == CaseStatus.REHABILITATION_REFERRED
                || NGO_STAGES.contains(item.getNewStatus())
                || NGO_STAGES.contains(item.getOldStatus())
                || item.getOldStatus() == CaseStatus.REHABILITATION_REFERRED
                && item.getNewStatus() == CaseStatus.INVESTIGATION_COMPLETED;
    }

    private NgoCaseResponse response(CaseReport report) {
        String ngoName = report.getAssignedNgoId() == null ? null
                : organizations.findById(report.getAssignedNgoId()).map(NgoOrganization::getName).orElse(null);
        return NgoCaseResponse.from(report, ngoName);
    }

    private void requireCaseAccess(CaseReport report, Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) return;
        if (!hasRole(authentication, "NGO_OFFICIAL") && !hasRole(authentication, "NGO_STAFF"))
            throw forbidden("NGO workspace access is required.");
        Long ngoId = authenticatedNgoId(authentication);
        if (report.getAssignedNgoId() == null || !report.getAssignedNgoId().equals(ngoId))
            throw forbidden("This case is not assigned to your NGO.");
    }

    private Long authenticatedNgoId(Authentication authentication) {
        if (!hasRole(authentication, "NGO_OFFICIAL") && !hasRole(authentication, "NGO_STAFF"))
            throw forbidden("NGO official access is required.");
        User user = users.findById(userId(authentication))
                .orElseThrow(() -> forbidden("The NGO account could not be found."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getNgoOrganizationId() == null)
            throw forbidden("Your active account is not linked to an NGO.");
        NgoOrganization organization = organizations.findById(user.getNgoOrganizationId())
                .orElseThrow(() -> forbidden("Your NGO organization could not be found."));
        if (!organization.isActive())
            throw forbidden("Your NGO organization is inactive.");
        return user.getNgoOrganizationId();
    }

    private NgoOrganization assignedOrganization(CaseReport report) {
        if (report.getAssignedNgoId() == null)
            throw bad("The case does not have an assigned NGO.");
        return organizations.findByIdForUpdate(report.getAssignedNgoId())
                .orElseThrow(() -> bad("The assigned NGO could not be found."));
    }

    private void requireOfficerOrAdmin(Authentication authentication) {
        if (!hasRole(authentication, "OFFICER") && !hasRole(authentication, "ADMIN"))
            throw forbidden("Only officers and administrators can list referral options.");
    }

    private void notifyStage(CaseReport report, CaseStatus previous, CaseStatus next,
                             Authentication authentication) {
        events.publishEvent(new CaseStatusChangedEvent(report, report.getId(), report.getCaseNumber(),
                previous, next, userId(authentication), report.getAssignedOfficerId(),
                report.getUrgencyLevel(), "Rehabilitation case stage updated"));
    }

    private void recordHistory(CaseReport report, CaseStatus previous, CaseStatus next,
                               Authentication authentication, String details, String progressNote) {
        recordHistory(report, previous, next, authentication, details, progressNote,
                null, null, null, null, null);
    }

    private void recordHistory(CaseReport report, CaseStatus previous, CaseStatus next,
                               Authentication authentication, String details, String progressNote,
                               Long centerId, java.time.LocalDate admissionDate, String educationUpdate,
                               String healthUpdate, String counsellingUpdate) {
        CaseStatusHistory entry = new CaseStatusHistory();
        entry.setCaseReportId(report.getId());
        entry.setOldStatus(previous);
        entry.setNewStatus(next);
        entry.setActorUserId(userId(authentication));
        entry.setActorRole(authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
                .findFirst().orElse("UNKNOWN"));
        entry.setDetails(details);
        entry.setProgressNote(progressNote);
        entry.setCenterId(centerId);
        entry.setAdmissionDate(admissionDate);
        entry.setEducationUpdate(educationUpdate);
        entry.setHealthUpdate(healthUpdate);
        entry.setCounsellingUpdate(counsellingUpdate);
        history.save(entry);
    }

    private void recordAudit(Authentication authentication, String action, Long caseId, String message) {
        AuditLog entry = new AuditLog();
        entry.setAdminUserId(userId(authentication));
        entry.setActorRole(authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
                .findFirst().orElse("UNKNOWN"));
        entry.setAction(action);
        entry.setTargetEntity("CaseReport");
        entry.setTargetId(caseId);
        entry.setAfterState(message);
        audit.save(entry);
    }

    private CaseReport report(Long id) {
        return reports.findById(id).orElseThrow(() ->
                new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Case not found."));
    }

    private Long userId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (RuntimeException exception) {
            throw forbidden("Authenticated user id is required.");
        }
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role)
                        || authority.getAuthority().equals(role));
    }

    private ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, message);
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, message);
    }
}
