package com.clrms.service;

import com.clrms.dto.CaseReportRequest;
import com.clrms.dto.CaseReportResponse;
import com.clrms.dto.CaseReportPublicResponse;
import com.clrms.entity.*;
import com.clrms.repository.CaseReportRepository;
import com.clrms.repository.CaseAssignmentRepository;
import com.clrms.repository.CaseStatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.clrms.exception.FieldValidationException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static com.clrms.util.InputSanitizer.clean;

@Service
public class CaseReportService {
    private final CaseReportRepository repository;
    private final FileStorageService storage;
    private final ApplicationEventPublisher eventPublisher;
    private final CaseAssignmentRepository assignments;
    private final CaseStatusHistoryRepository statusHistory;

    @Autowired
    public CaseReportService(CaseReportRepository repository, FileStorageService storage, ApplicationEventPublisher eventPublisher, CaseAssignmentRepository assignments, CaseStatusHistoryRepository statusHistory) {
        this.repository = repository;
        this.storage = storage;
        this.eventPublisher = eventPublisher;
        this.assignments = assignments;
        this.statusHistory = statusHistory;
    }

    public CaseReportService(CaseReportRepository repository, FileStorageService storage, ApplicationEventPublisher eventPublisher, CaseAssignmentRepository assignments) {
        this(repository, storage, eventPublisher, assignments, null);
    }

    public CaseReportService(CaseReportRepository repository, FileStorageService storage, ApplicationEventPublisher eventPublisher) {
        this(repository, storage, eventPublisher, null);
    }

    @Transactional
    public CaseReportResponse create(CaseReportRequest request, List<MultipartFile> files, Authentication authentication) {
        List<MultipartFile> uploads = files == null ? List.of() : files;
        if (uploads.stream().noneMatch(EvidenceFileRules::isPhoto)) {
            String message = "At least one photo is required as evidence";
            throw new FieldValidationException(message, java.util.Map.of("files", message));
        }
        Long reporterId = reporterIdForSubmission(request.isAnonymous(), authentication);
        CaseReport report = new CaseReport();
        report.setReporterId(reporterId);
        report.setAnonymous(request.isAnonymous());
        if (!request.isAnonymous()) {
            report.setReporterName(clean(request.getReporterName()));
            report.setReporterEmail(clean(request.getReporterEmail()));
            report.setReporterPhone(clean(request.getReporterPhone()));
        }
        report.setChildName(clean(request.getChildName()));
        report.setApproxAge(request.getApproxAge());
        report.setGender(request.getGender());
        report.setChildDescription(clean(request.getChildDescription()));
        report.setLocationAddress(clean(request.getLocationAddress()));
        if (report.getLocationAddress() == null || report.getLocationAddress().isBlank()) throw new IllegalArgumentException("Location address is required");
        report.setTownOrCity(clean(request.getTownOrCity()));
        report.setLatitude(request.getLatitude());
        report.setLongitude(request.getLongitude());
        report.setPincode(clean(request.getPincode()));
        report.setLandmark(clean(request.getLandmark()));
        report.setDistrict(clean(request.getDistrict()));
        report.setState(clean(request.getState()));
        report.setIncidentDescription(clean(request.getIncidentDescription()));
        report.setDateOfIncident(request.getDateOfIncident());
        report.setUrgencyLevel(request.getApproxAge() != null && request.getApproxAge() < 10 ? UrgencyLevel.CRITICAL : request.getUrgencyLevel() == null ? UrgencyLevel.MEDIUM : request.getUrgencyLevel());
        report.setStatus(CaseStatus.REPORTED);
        report.setCaseNumber(generateCaseNumber());
        report.setTrackingCode(generateTrackingCode());

        for (MultipartFile file : uploads) {
            CaseEvidence evidence = new CaseEvidence();
            evidence.setCaseReport(report);
            evidence.setFileUrl(storage.store(file));
            evidence.setFileType(EvidenceFileRules.fileType(file));
            evidence.setUploadedBy(reporterId);
            report.getEvidence().add(evidence);
        }
        CaseReport saved = repository.save(report);
        if (statusHistory != null) {
            CaseStatusHistory history = new CaseStatusHistory(); history.setCaseReportId(saved.getId()); history.setNewStatus(CaseStatus.REPORTED);
            history.setActorUserId(reporterId); history.setActorRole(reporterId == null ? "PUBLIC" : "CITIZEN"); history.setDetails("Complaint submitted"); statusHistory.save(history);
        }
        eventPublisher.publishEvent(new NewCaseReportedEvent(saved, saved.getId(), saved.getCaseNumber()));
        return CaseReportResponse.from(saved, true);
    }

    @Transactional
    public CaseReportResponse.EvidenceResponse addAudioEvidence(Long id, MultipartFile file, String trackingCode,
                                                                 Authentication authentication) {
        if (id == null) throw new IllegalArgumentException("Report id is required");
        CaseReport report = repository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found"));
        if (report.isAnonymous()) {
            if (trackingCode == null || report.getTrackingCode() == null || !java.security.MessageDigest.isEqual(
                    trackingCode.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    report.getTrackingCode().getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found");
            }
        } else if (!java.util.Objects.equals(currentUserId(authentication), report.getReporterId())
                && !hasRole(authentication, "ADMIN") && !hasRole(authentication, "OFFICER")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "You cannot add evidence to this report");
        }

        if (file == null || file.isEmpty() || !EvidenceFileRules.isAudio(file)) {
            throw new IllegalArgumentException("Upload an audio recording in webm, mp3, wav, m4a, or ogg format");
        }
        CaseEvidence evidence = new CaseEvidence();
        evidence.setCaseReport(report);
        evidence.setFileUrl(storage.store(file));
        evidence.setFileType(EvidenceFileType.AUDIO);
        evidence.setUploadedBy(report.isAnonymous() ? null : currentUserId(authentication));
        report.getEvidence().add(evidence);
        repository.saveAndFlush(report);
        return new CaseReportResponse.EvidenceResponse(evidence.getId(), evidence.getFileUrl(), evidence.getFileType(), evidence.getUploadedAt(), evidence.getUploadedBy());
    }

    @Transactional
    public List<CaseReportResponse> myReports(Authentication authentication) {
        Long reporterId = currentUserId(authentication);
        if (reporterId == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        return repository.findByReporterIdOrderByCreatedAtDesc(reporterId).stream().map(report -> {
            if (report.getTrackingCode() == null) {
                report.setTrackingCode(generateTrackingCode());
                report = repository.save(report);
            }
            return CaseReportResponse.from(report, true);
        }).toList();
    }

    @Transactional(readOnly = true)
    public CaseReportPublicResponse track(String caseNumber, String trackingCode) {
        return repository.findByCaseNumberAndTrackingCode(caseNumber, trackingCode)
                .map(CaseReportPublicResponse::from)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found"));
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<CaseReportResponse> search(CaseStatus status, UrgencyLevel urgency, String district, LocalDate from, LocalDate to, Pageable pageable) {
        return search(status, urgency, district, from, to, pageable, null);
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<CaseReportResponse> search(CaseStatus status, UrgencyLevel urgency, String district, LocalDate from, LocalDate to, Pageable pageable, Authentication authentication) {
        Specification<CaseReport> specification = Specification.where(status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status));
        if (urgency != null) specification = specification.and((root, query, cb) -> cb.equal(root.get("urgencyLevel"), urgency));
        if (district != null && !district.isBlank()) specification = specification.and((root, query, cb) -> cb.equal(root.get("district"), district));
        if (from != null) specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateOfIncident"), from));
        if (to != null) specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("dateOfIncident"), to));
        if (hasRole(authentication, "OFFICER")) specification = specification.and((root, query, cb) -> {
            var subquery = query.subquery(Long.class);
            var assignment = subquery.from(CaseAssignment.class);
            var latestQuery = subquery.subquery(Long.class);
            var latest = latestQuery.from(CaseAssignment.class);
            latestQuery.select(cb.max(latest.get("id"))).where(cb.equal(latest.get("caseReportId"), root.get("id")));
            subquery.select(assignment.get("caseReportId")).where(cb.equal(assignment.get("assignedOfficerId"), currentUserId(authentication)),
                    cb.equal(assignment.get("caseReportId"), root.get("id")), cb.equal(assignment.get("id"), latestQuery));
            return cb.exists(subquery);
        });
        return repository.findAll(specification, pageable).map(report -> CaseReportResponse.from(report, false));
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public CaseReportResponse get(Long id, Authentication authentication) {
        CaseReport report = repository.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found"));
        boolean isReporter = currentUserId(authentication) != null && currentUserId(authentication).equals(report.getReporterId());
        if (hasRole(authentication, "ADMIN") || isReporter) return CaseReportResponse.from(report, isReporter || hasRole(authentication, "ADMIN"));
        if (hasRole(authentication, "OFFICER") && assignments != null
                && assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(id)
                .map(assignment -> assignment.getAssignedOfficerId().equals(currentUserId(authentication))).orElse(false)) {
            return CaseReportResponse.from(report, false);
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private Long reporterIdForSubmission(boolean anonymous, Authentication authentication) {
        if (anonymous) return null;
        // If a CITIZEN is logged in, link the report to their account.
        // Otherwise, allow the report with reporter contact details from the form (no account required).
        if (hasRole(authentication, "CITIZEN")) {
            Long id = currentUserId(authentication);
            if (id != null) return id;
        }
        return null;
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        try { return Long.valueOf(authentication.getName()); } catch (NumberFormatException ignored) { return null; }
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null && authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role) || authority.getAuthority().equals(role));
    }

    private String generateCaseNumber() {
        String year = String.valueOf(java.time.Year.now().getValue());
        String caseNumber;
        do { caseNumber = "CLR-" + year + "-" + String.format("%06d", (int) (Math.random() * 1_000_000)); }
        while (repository.existsByCaseNumber(caseNumber));
        return caseNumber;
    }

    private String generateTrackingCode() {
        String trackingCode;
        do { trackingCode = UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(); }
        while (repository.existsByTrackingCode(trackingCode));
        return trackingCode;
    }

}
