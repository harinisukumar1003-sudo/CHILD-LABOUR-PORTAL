package com.clrms.service;

import com.clrms.dto.CaseReportRequest;
import com.clrms.dto.CaseReportResponse;
import com.clrms.dto.CaseReportPublicResponse;
import com.clrms.entity.*;
import com.clrms.repository.CaseReportRepository;
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

    public CaseReportService(CaseReportRepository repository, FileStorageService storage, ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.storage = storage;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public CaseReportResponse create(CaseReportRequest request, List<MultipartFile> files, Authentication authentication) {
        Long reporterId = reporterIdForSubmission(request.isAnonymous(), authentication);
        CaseReport report = new CaseReport();
        report.setReporterId(reporterId);
        report.setAnonymous(request.isAnonymous());
        report.setChildName(clean(request.getChildName()));
        report.setApproxAge(request.getApproxAge());
        report.setGender(request.getGender());
        report.setChildDescription(clean(request.getChildDescription()));
        report.setLocationAddress(clean(request.getLocationAddress()));
        if (report.getLocationAddress() == null || report.getLocationAddress().isBlank()) throw new IllegalArgumentException("Location address is required");
        report.setLatitude(request.getLatitude());
        report.setLongitude(request.getLongitude());
        report.setDistrict(clean(request.getDistrict()));
        report.setState(clean(request.getState()));
        report.setIncidentDescription(clean(request.getIncidentDescription()));
        report.setEmployerOrLocationDetails(clean(request.getEmployerOrLocationDetails()));
        report.setDateOfIncident(request.getDateOfIncident());
        report.setUrgencyLevel(request.getApproxAge() != null && request.getApproxAge() < 10 ? UrgencyLevel.CRITICAL : request.getUrgencyLevel() == null ? UrgencyLevel.MEDIUM : request.getUrgencyLevel());
        report.setStatus(CaseStatus.REPORTED);
        report.setCaseNumber(generateCaseNumber());
        if (request.isAnonymous()) report.setTrackingCode(generateTrackingCode());

        for (MultipartFile file : files == null ? List.<MultipartFile>of() : files) {
            CaseEvidence evidence = new CaseEvidence();
            evidence.setCaseReport(report);
            evidence.setFileUrl(storage.store(file));
            evidence.setFileType(fileType(file));
            evidence.setUploadedBy(reporterId);
            report.getEvidence().add(evidence);
        }
        CaseReport saved = repository.save(report);
        eventPublisher.publishEvent(new NewCaseReportedEvent(saved, saved.getId(), saved.getCaseNumber()));
        return CaseReportResponse.from(saved, request.isAnonymous());
    }

    @Transactional(readOnly = true)
    public List<CaseReportResponse> myReports(Authentication authentication) {
        Long reporterId = currentUserId(authentication);
        if (reporterId == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        return repository.findByReporterIdOrderByCreatedAtDesc(reporterId).stream().map(report -> CaseReportResponse.from(report, false)).toList();
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
        Specification<CaseReport> specification = Specification.where(status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status));
        if (urgency != null) specification = specification.and((root, query, cb) -> cb.equal(root.get("urgencyLevel"), urgency));
        if (district != null && !district.isBlank()) specification = specification.and((root, query, cb) -> cb.equal(root.get("district"), district));
        if (from != null) specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateOfIncident"), from));
        if (to != null) specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("dateOfIncident"), to));
        return repository.findAll(specification, pageable).map(report -> CaseReportResponse.from(report, false));
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public CaseReportResponse get(Long id, Authentication authentication) {
        CaseReport report = repository.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Report not found"));
        if (hasRole(authentication, "ADMIN") || hasRole(authentication, "OFFICER") || hasRole(authentication, "NGO_STAFF") || (currentUserId(authentication) != null && currentUserId(authentication).equals(report.getReporterId()))) {
            return hasRole(authentication, "NGO_STAFF") ? CaseReportResponse.forNgo(report) : CaseReportResponse.from(report, false);
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private Long reporterIdForSubmission(boolean anonymous, Authentication authentication) {
        if (anonymous) return null;
        if (!hasRole(authentication, "CITIZEN")) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Citizen authentication is required");
        Long id = currentUserId(authentication);
        if (id == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Authenticated user id is required");
        return id;
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

    private EvidenceFileType fileType(MultipartFile file) {
        @SuppressWarnings("null")
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (name.endsWith(".jpg") || name.endsWith(".png")) return EvidenceFileType.IMAGE;
        if (name.endsWith(".mp4")) return EvidenceFileType.VIDEO;
        return EvidenceFileType.DOCUMENT;
    }
}