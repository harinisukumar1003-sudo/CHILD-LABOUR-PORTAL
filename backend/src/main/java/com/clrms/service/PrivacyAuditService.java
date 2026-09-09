package com.clrms.service;

import com.clrms.dto.PrivacyRevealRequest;
import com.clrms.entity.AuditLog;
import com.clrms.repository.AuditLogRepository;
import com.clrms.repository.CaseAssignmentRepository;
import com.clrms.repository.CaseReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PrivacyAuditService {
    private final AuditLogRepository audit;
    private final CaseReportRepository reports;
    private final CaseAssignmentRepository assignments;

    public PrivacyAuditService(AuditLogRepository audit, CaseReportRepository reports, CaseAssignmentRepository assignments) { this.audit = audit; this.reports = reports; this.assignments = assignments; }

    @Transactional
    @SuppressWarnings("null")
    public void logReveal(PrivacyRevealRequest request, Authentication authentication, String ipAddress) {
        if (!allowedField(request.getField())) throw new IllegalArgumentException("Sensitive field cannot be revealed");
        if (!reports.existsById(request.getCaseId())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found");
        if (!hasRole(authentication, "ADMIN")) {
            Long actor = userId(authentication);
            boolean assigned = assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(request.getCaseId()).map(item -> actor.equals(item.getAssignedOfficerId())).orElse(false);
            if (!assigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sensitive access is restricted to the assigned case team");
        }
        AuditLog log = new AuditLog(); log.setAdminUserId(userId(authentication)); log.setAction("REVEAL_SENSITIVE_FIELD"); log.setTargetEntity("CaseReport"); log.setTargetId(request.getCaseId()); log.setBeforeState("masked"); log.setAfterState(request.getField()); log.setIpAddress(ipAddress); audit.save(log);
    }

    private boolean allowedField(String field) { return "childName".equals(field) || "locationAddress".equals(field) || "reporterIdentity".equals(field); }
    private boolean hasRole(Authentication authentication, String role) { return authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role)); }
    private Long userId(Authentication authentication) { try { return Long.valueOf(authentication.getName()); } catch (Exception ignored) { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user id is required"); } }
}