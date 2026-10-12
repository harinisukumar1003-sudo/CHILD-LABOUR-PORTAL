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
    public CaseReportResponse create(CaseReportRequest request, Authentication authentication) {
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

        for (MultipartFile file : request.getFiles() == null ? List.<MultipartFile>of() : request.getFiles()) {
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

        if (file == null || file.isEmpty() || !isAudioFile(file)) {
            throw new IllegalArgumentException("Upload an audio recording in webm, mp3, wav, or m4a format");
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
        String originalFilename = file.getOriginalFilename();
        String filenameLowercase = originalFilename == null ? "" : originalFilename.toLowerCase(java.util.Locale.ROOT);
        if (filenameLowercase.endsWith(".jpg") || filenameLowercase.endsWith(".jpeg") || filenameLowercase.endsWith(".png")) return EvidenceFileType.IMAGE;
        if (filenameLowercase.endsWith(".mp4")) return EvidenceFileType.VIDEO;
        if (isAudioFile(file)) return EvidenceFileType.AUDIO;
        return EvidenceFileType.DOCUMENT;
    }

    private boolean isAudioFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String filenameLowercase = originalFilename == null ? "" : originalFilename.toLowerCase(java.util.Locale.ROOT);
        return filenameLowercase.endsWith(".webm") || filenameLowercase.endsWith(".mp3")
                || filenameLowercase.endsWith(".wav") || filenameLowercase.endsWith(".m4a");
    }
}