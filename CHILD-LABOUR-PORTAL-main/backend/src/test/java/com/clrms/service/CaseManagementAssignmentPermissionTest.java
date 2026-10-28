package com.clrms.service;

import com.clrms.dto.CaseOfficerAssignmentRequest;
import com.clrms.dto.CaseRehabilitationReferralRequest;
import com.clrms.dto.CaseStatusUpdateRequest;
import com.clrms.entity.CaseAssignment;
import com.clrms.entity.CaseAssignmentLog;
import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.NgoOrganization;
import com.clrms.entity.UrgencyLevel;
import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import com.clrms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CaseManagementAssignmentPermissionTest {
    private final CaseReportRepository reports = mock(CaseReportRepository.class);
    private final CaseAssignmentRepository assignments = mock(CaseAssignmentRepository.class);
    private final CaseAssignmentLogRepository assignmentLogs = mock(CaseAssignmentLogRepository.class);
    private final CaseInvestigationLogRepository logs = mock(CaseInvestigationLogRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final UserRepository users = mock(UserRepository.class);
    private final CaseStatusHistoryRepository statusHistory = mock(CaseStatusHistoryRepository.class);
    private final RehabilitationCaseRepository rehabilitationCases = mock(RehabilitationCaseRepository.class);
    private final FileStorageService storage = mock(FileStorageService.class);
    private final CaseOfficerVerificationRepository verifications = mock(CaseOfficerVerificationRepository.class);
    private final AuditLogRepository auditLogs = mock(AuditLogRepository.class);
    private final OfficerProfileRepository officerProfiles = mock(OfficerProfileRepository.class);
    private final NgoOrganizationRepository ngoOrganizations = mock(NgoOrganizationRepository.class);
    private final CaseManagementService service = new CaseManagementService(
            reports, assignments, assignmentLogs, logs, new CaseStatusTransitionService(), events, users,
            statusHistory, rehabilitationCases, storage, verifications, auditLogs, officerProfiles, ngoOrganizations);

    @BeforeEach
    void resetMocks() {
        org.mockito.Mockito.reset(reports, assignments, assignmentLogs, logs, events, users, statusHistory,
                rehabilitationCases, storage, verifications, auditLogs, officerProfiles, ngoOrganizations);
    }

    @Test
    void assignmentPersistsCurrentOfficerAndAssignmentAuditFields() {
        CaseReport report = new CaseReport();
        report.setId(12L);
        report.setCaseNumber("CLR-2026-000012");
        report.setDistrict("Chennai");
        report.setStatus(CaseStatus.UNDER_REVIEW);
        report.setUrgencyLevel(UrgencyLevel.MEDIUM);
        when(reports.findById(12L)).thenReturn(Optional.of(report));
        User officer = new User();
        officer.setId(7L);
        officer.setRole(UserRole.OFFICER);
        officer.setStatus(UserStatus.ACTIVE);
        when(users.findById(7L)).thenReturn(Optional.of(officer));
        when(assignments.findFirstByCaseReportIdOrderByAssignedAtDesc(12L)).thenReturn(Optional.empty());
        when(assignments.save(any(CaseAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(logs.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(statusHistory.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(auditLogs.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var administrator = authentication("1", "ADMIN");

        service.assign(12L, new CaseOfficerAssignmentRequest(7L), administrator);

        assertEquals(7L, report.getAssignedOfficerId());
        assertEquals(CaseStatus.ASSIGNED_TO_OFFICER, report.getStatus());
        assertNotNull(report.getAssignedAt());
        verify(reports, org.mockito.Mockito.times(2)).save(report);
        var assignmentLog = forClass(CaseAssignmentLog.class);
        verify(assignmentLogs).save(assignmentLog.capture());
        assertEquals(12L, assignmentLog.getValue().getCaseId());
        assertEquals(7L, assignmentLog.getValue().getToOfficerId());
        assertEquals(1L, assignmentLog.getValue().getAssignedBy());
        assertNull(assignmentLog.getValue().getFromOfficerId());
        verify(events).publishEvent(any(CaseAssignedEvent.class));
    }

    @Test
    void officerCannotChangeCaseStatusWhenCaseIsAssignedToSomeoneElse() {
        CaseReport report = new CaseReport();
        report.setId(12L);
        report.setStatus(CaseStatus.ASSIGNED_TO_OFFICER);
        report.setAssignedOfficerId(7L);
        when(reports.findById(12L)).thenReturn(Optional.of(report));
        CaseStatusUpdateRequest request = new CaseStatusUpdateRequest();
        request.setStatus(CaseStatus.INVESTIGATING);
        request.setRemarks("Start investigation");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateStatus(12L, request, authentication("8", "OFFICER")));

        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void officerBoardQueryUsesOnlyCasesWithTheirCurrentAssignedOfficerId() {
        CaseReport caseReport = new CaseReport();
        caseReport.setId(21L);
        caseReport.setAssignedOfficerId(7L);
        caseReport.setStatus(CaseStatus.ASSIGNED_TO_OFFICER);
        when(reports.findByAssignedOfficerIdOrderByAssignedAtDesc(7L)).thenReturn(List.of(caseReport));
        User officer = new User();
        officer.setName("Assigned Officer");
        when(users.findById(7L)).thenReturn(Optional.of(officer));

        var result = service.assignedToMe(authentication("7", "OFFICER"));

        assertEquals(1, result.size());
        assertEquals(21L, result.get(0).id());
        verify(reports).findByAssignedOfficerIdOrderByAssignedAtDesc(7L);
        verify(assignments, never()).findByAssignedOfficerIdOrderByAssignedAtDesc(7L);
    }

    @Test
    void officerCannotStartInvestigationBeforeManualVerification() {
        CaseReport report = new CaseReport();
        report.setId(12L);
        report.setAssignedOfficerId(7L);
        report.setStatus(CaseStatus.ASSIGNED_TO_OFFICER);
        when(reports.findById(12L)).thenReturn(Optional.of(report));
        CaseStatusUpdateRequest request = new CaseStatusUpdateRequest();
        request.setStatus(CaseStatus.INVESTIGATING);
        request.setRemarks("Start investigation");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateStatus(12L, request, authentication("7", "OFFICER")));

        assertEquals(400, exception.getStatusCode().value());
        verify(reports, never()).save(report);
    }

    @Test
    void genericStatusEndpointCannotBypassTheRehabilitationReferralAction() {
        CaseReport report = new CaseReport();
        report.setId(12L);
        report.setStatus(CaseStatus.INVESTIGATION_COMPLETED);
        when(reports.findById(12L)).thenReturn(Optional.of(report));
        CaseStatusUpdateRequest request = new CaseStatusUpdateRequest();
        request.setStatus(CaseStatus.REHABILITATION_REFERRED);
        request.setRemarks("Refer to an NGO");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateStatus(12L, request, authentication("1", "ADMIN")));

        assertEquals(400, exception.getStatusCode().value());
        verify(reports, never()).save(report);
    }

    @Test
    void rehabilitationReferralNotifiesEveryActiveNgoOfficial() {
        CaseReport report = new CaseReport();
        report.setId(12L);
        report.setCaseNumber("CLR-2026-000012");
        report.setStatus(CaseStatus.INVESTIGATION_COMPLETED);
        report.setAssignedOfficerId(7L);
        report.setManualVerificationDone(true);
        report.setUrgencyLevel(UrgencyLevel.MEDIUM);
        when(reports.findById(12L)).thenReturn(Optional.of(report));
        NgoOrganization ngo = new NgoOrganization();
        ngo.setId(9L);
        ngo.setName("Local NGO");
        ngo.setActive(true);
        ngo.setCapacity(10);
        ngo.setAvailableBeds(4);
        when(ngoOrganizations.findByIdForUpdate(9L)).thenReturn(Optional.of(ngo));
        User firstOfficial = new User();
        firstOfficial.setId(20L);
        User secondOfficial = new User();
        secondOfficial.setId(21L);
        when(users.findByNgoOrganizationIdAndRoleInAndStatus(eq(9L), any(), eq(UserStatus.ACTIVE)))
                .thenReturn(List.of(firstOfficial, secondOfficial));
        when(ngoOrganizations.save(ngo)).thenReturn(ngo);
        when(reports.save(report)).thenReturn(report);
        when(logs.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(statusHistory.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(auditLogs.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.referToRehabilitation(12L,
                new CaseRehabilitationReferralRequest(9L, "Referral based on completed investigation"),
                authentication("7", "OFFICER"));

        var event = forClass(NgoReferralCreatedEvent.class);
        verify(events).publishEvent(event.capture());
        assertEquals(List.of(20L, 21L), event.getValue().recipientUserIds());
        assertEquals(CaseStatus.REHABILITATION_REFERRED, report.getStatus());
        assertEquals(3, ngo.getAvailableBeds());
    }

    private UsernamePasswordAuthenticationToken authentication(String userId, String role) {
        return new UsernamePasswordAuthenticationToken(userId, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
}
