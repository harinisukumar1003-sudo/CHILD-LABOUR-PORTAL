package com.clrms.service;

import com.clrms.dto.NgoCaseRejectionRequest;
import com.clrms.dto.NgoRehabilitationStageRequest;
import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.NgoOrganization;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NgoCaseServiceTest {
    private final CaseReportRepository reports = mock(CaseReportRepository.class);
    private final NgoOrganizationRepository organizations = mock(NgoOrganizationRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RehabilitationCenterRepository centers = mock(RehabilitationCenterRepository.class);
    private final CaseStatusHistoryRepository history = mock(CaseStatusHistoryRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final AuditLogRepository audit = mock(AuditLogRepository.class);
    private final NgoCaseService service = new NgoCaseService(reports, organizations, users, centers,
            history, new CaseStatusTransitionService(), events, audit);

    @BeforeEach
    void resetMocks() {
        reset(reports, organizations, users, centers, history, events, audit);
    }

    @Test
    void ngoCaseListQueriesOnlyTheAuthenticatedOrganization() {
        User official = ngoOfficial(21L, 101L);
        CaseReport ownCase = caseReport(7L, 101L, CaseStatus.REHABILITATION_REFERRED);
        when(users.findById(21L)).thenReturn(Optional.of(official));
        when(organizations.findById(101L)).thenReturn(Optional.of(activeOrganization(101L)));
        when(reports.findByAssignedNgoIdOrderByReferredAtDesc(101L)).thenReturn(List.of(ownCase));

        var result = service.myCases(authentication("21", "NGO_OFFICIAL"));

        assertEquals(1, result.size());
        assertEquals(7L, result.get(0).id());
        verify(reports).findByAssignedNgoIdOrderByReferredAtDesc(101L);
        verify(reports, never()).findAll(any(org.springframework.data.domain.Sort.class));
    }

    @Test
    void ngoCannotReadAnotherOrganizationsCaseHistory() {
        when(reports.findById(7L)).thenReturn(Optional.of(
                caseReport(7L, 202L, CaseStatus.REHABILITATION_REFERRED)));
        when(users.findById(21L)).thenReturn(Optional.of(ngoOfficial(21L, 101L)));
        when(organizations.findById(101L)).thenReturn(Optional.of(activeOrganization(101L)));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.statusHistory(7L, authentication("21", "NGO_OFFICIAL")));

        assertEquals(403, exception.getStatusCode().value());
        verify(history, never()).findByCaseReportIdOrderByCreatedAtAscIdAsc(7L);
    }

    @Test
    void officerCannotAdvanceAnNgoRehabilitationStage() {
        when(reports.findById(7L)).thenReturn(Optional.of(
                caseReport(7L, 101L, CaseStatus.REHABILITATION_ACCEPTED)));
        var request = new NgoRehabilitationStageRequest(CaseStatus.ADMITTED_TO_CENTRE,
                "Admission recorded", null, null, null, null, null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.advance(7L, request, authentication("34", "OFFICER")));

        assertEquals(403, exception.getStatusCode().value());
        verify(reports, never()).save(any(CaseReport.class));
    }

    @Test
    void rejectionReturnsCaseToOfficerAndReleasesReservedCapacity() {
        CaseReport report = caseReport(7L, 101L, CaseStatus.REHABILITATION_REFERRED);
        report.setAssignedOfficerId(34L);
        NgoOrganization organization = activeOrganization(101L);
        organization.setCapacity(10);
        organization.setAvailableBeds(4);
        when(reports.findById(7L)).thenReturn(Optional.of(report));
        when(users.findById(21L)).thenReturn(Optional.of(ngoOfficial(21L, 101L)));
        when(organizations.findById(101L)).thenReturn(Optional.of(organization));
        when(organizations.findByIdForUpdate(101L)).thenReturn(Optional.of(organization));
        when(reports.save(report)).thenReturn(report);
        when(history.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(audit.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.reject(7L, new NgoCaseRejectionRequest("No immediate placement capacity"),
                authentication("21", "NGO_OFFICIAL"));

        assertEquals(CaseStatus.INVESTIGATION_COMPLETED, result.status());
        assertNull(result.assignedNgoId());
        assertEquals(5, organization.getAvailableBeds());
        verify(reports).save(report);
        verify(events).publishEvent(any(CaseStatusChangedEvent.class));
        verify(history).save(argThat(entry ->
                entry.getNewStatus() == CaseStatus.INVESTIGATION_COMPLETED
                        && "No immediate placement capacity".equals(entry.getProgressNote())));
    }

    @Test
    void ngoCannotSkipARehabilitationStage() {
        when(reports.findById(7L)).thenReturn(Optional.of(
                caseReport(7L, 101L, CaseStatus.REHABILITATION_ACCEPTED)));
        when(users.findById(21L)).thenReturn(Optional.of(ngoOfficial(21L, 101L)));
        when(organizations.findById(101L)).thenReturn(Optional.of(activeOrganization(101L)));
        var request = new NgoRehabilitationStageRequest(CaseStatus.IN_REHABILITATION,
                "Starting services", null, null, null, null, null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.advance(7L, request, authentication("21", "NGO_OFFICIAL")));

        assertEquals(400, exception.getStatusCode().value());
        verify(reports, never()).save(any(CaseReport.class));
    }

    private CaseReport caseReport(Long id, Long ngoId, CaseStatus status) {
        CaseReport report = new CaseReport();
        report.setId(id);
        report.setCaseNumber("CLR-2026-000007");
        report.setAssignedNgoId(ngoId);
        report.setStatus(status);
        return report;
    }

    private NgoOrganization activeOrganization(Long id) {
        NgoOrganization organization = new NgoOrganization();
        organization.setId(id);
        organization.setActive(true);
        return organization;
    }

    private User ngoOfficial(Long id, Long ngoId) {
        User user = new User();
        user.setId(id);
        user.setRole(UserRole.NGO_OFFICIAL);
        user.setStatus(UserStatus.ACTIVE);
        user.setNgoOrganizationId(ngoId);
        return user;
    }

    private UsernamePasswordAuthenticationToken authentication(String userId, String role) {
        return new UsernamePasswordAuthenticationToken(userId, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
}
