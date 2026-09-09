package com.clrms.service;

import com.clrms.dto.CaseTimelineEntryResponse;
import com.clrms.entity.CaseInvestigationLog;
import com.clrms.entity.RehabilitationCase;
import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.repository.CaseInvestigationLogRepository;
import com.clrms.repository.CaseReportRepository;
import com.clrms.repository.RehabilitationCaseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class CaseTrackingService {
    private final CaseReportRepository reports;
    private final CaseInvestigationLogRepository logs;
    private final RehabilitationCaseRepository rehabilitationCases;

    public CaseTrackingService(CaseReportRepository reports, CaseInvestigationLogRepository logs,
                               RehabilitationCaseRepository rehabilitationCases) {
        this.reports = reports;
        this.logs = logs;
        this.rehabilitationCases = rehabilitationCases;
    }

    @Transactional(readOnly = true)
    public List<CaseTimelineEntryResponse> timeline(String caseNumber, Authentication authentication) {
        CaseReport report = reports.findByCaseNumber(caseNumber).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        boolean internal = isStaff(authentication);
        List<TimelineItem> items = new ArrayList<>();
        items.add(new TimelineItem("REPORTED", "Reported", report.getCreatedAt(), "CLRMS", "Report received", true));
        for (CaseInvestigationLog log : logs.findByCaseReportIdOrderByCreatedAtAsc(report.getId())) {
            if (!internal && log.getPreviousStatus() == log.getNewStatus()) continue;
            items.add(new TimelineItem(log.getNewStatus().name(), statusLabel(log.getNewStatus()), log.getCreatedAt(),
                    internal ? "User #" + log.getUpdatedByUserId() : "CLRMS response team",
                    internal ? log.getRemarks() : publicRemark(log.getNewStatus()), true));
        }
        RehabilitationCase rehabilitation = rehabilitationCases.findByCaseReportId(report.getId()).orElse(null);
        String currentStage = report.getStatus().name();
        if (rehabilitation != null) {
            if (items.stream().noneMatch(item -> item.stage().equals("REHABILITATION"))) {
            items.add(new TimelineItem("REHABILITATION", "Rehabilitation", rehabilitation.getStartDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant(),
                internal ? "Assigned care team" : "CLRMS care team", "A rehabilitation plan is in progress", true));
            }
            currentStage = report.getStatus() == CaseStatus.REHABILITATION ? "REHABILITATION_" + rehabilitation.getCurrentPhase().name() : report.getStatus().name();
            items.add(new TimelineItem(currentStage, "Rehabilitation · " + phaseLabel(rehabilitation.getCurrentPhase()), rehabilitation.getStartDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant(),
                internal ? "Assigned care team" : "CLRMS care team", internal ? "Current rehabilitation phase" : "Rehabilitation support is in progress", true));
        }
        @SuppressWarnings("null")
        final Comparator<TimelineItem> comp = Comparator.comparing(TimelineItem::timestamp);
        items.sort(comp);
        int currentIndex = lastCurrentIndex(items, currentStage);
        return items.stream().map((item) -> new CaseTimelineEntryResponse(item.stage(), item.label(), item.timestamp(), item.actor(), item.remarks(),
                item.completed() && items.indexOf(item) <= currentIndex, items.indexOf(item) == currentIndex)).toList();
    }

    private int lastCurrentIndex(List<TimelineItem> items, String currentStage) {
        for (int index = items.size() - 1; index >= 0; index--) if (items.get(index).stage().equals(currentStage)) return index;
        return items.size() - 1;
    }

    private String publicRemark(CaseStatus status) { return switch (status) {
        case UNDER_REVIEW -> "Your report is being reviewed";
        case ASSIGNED -> "The report has been assigned to a response team";
        case INVESTIGATING -> "The response team is investigating";
        case RESCUED -> "Safety support has been arranged";
        case REHABILITATION -> "Rehabilitation support is in progress";
        case CLOSED -> "This case journey has been completed";
        case REJECTED -> "The report review is complete";
        default -> "Case status updated";
    }; }

    private String statusLabel(CaseStatus status) { return switch (status) {
        case UNDER_REVIEW -> "Under Investigation";
        case REHABILITATION -> "Rehabilitation";
        default -> status.name().charAt(0) + status.name().substring(1).toLowerCase().replace('_', ' ');
    }; }

    private String phaseLabel(com.clrms.entity.RehabilitationPhase phase) { return switch (phase) {
        case MEDICAL_ASSESSMENT -> "Medical Assessment";
        case FAMILY_REINTEGRATION -> "Family Reintegration";
        case VOCATIONAL_TRAINING -> "Vocational Training";
        default -> phase.name().charAt(0) + phase.name().substring(1).toLowerCase();
    }; }

    private boolean isStaff(Authentication authentication) { return authentication != null && authentication.isAuthenticated() && authentication.getAuthorities().stream().anyMatch(authority -> Map.of("ROLE_OFFICER", true, "ROLE_NGO_STAFF", true, "ROLE_ADMIN", true).getOrDefault(authority.getAuthority(), false)); }
    private record TimelineItem(String stage, String label, Instant timestamp, String actor, String remarks, boolean completed) { }
}