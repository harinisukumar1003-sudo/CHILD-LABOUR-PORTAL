package com.clrms.service;

import com.clrms.dto.ContactRequest;
import com.clrms.dto.ContactResponse;
import com.clrms.dto.PublicStatsResponse;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.Contact;
import com.clrms.entity.RehabilitationPhase;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import com.clrms.repository.CaseReportRepository;
import com.clrms.repository.ContactRepository;
import com.clrms.repository.RehabilitationCaseRepository;
import com.clrms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicApiService {
    private final CaseReportRepository caseReports;
    private final RehabilitationCaseRepository rehabilitationCases;
    private final UserRepository users;
    private final ContactRepository contacts;

    public PublicApiService(CaseReportRepository caseReports,
                           RehabilitationCaseRepository rehabilitationCases,
                           UserRepository users,
                           ContactRepository contacts) {
        this.caseReports = caseReports;
        this.rehabilitationCases = rehabilitationCases;
        this.users = users;
        this.contacts = contacts;
    }

    @Transactional(readOnly = true)
    public PublicStatsResponse getPublicStats() {
        // Total cases reported
        long casesReported = caseReports.count();

        // Children rescued (cases with RESCUED status)
        long childrenRescued = caseReports.findAll().stream()
            .filter(report -> report.getStatus() == CaseStatus.RESCUED)
            .count();

        // Ongoing rehabilitation (cases in progress, excluding COMPLETED)
        long ongoingRehabilitation = rehabilitationCases.findAll().stream()
            .filter(rc -> rc.getCurrentPhase() != RehabilitationPhase.COMPLETED)
            .count();

        // Active officers (OFFICER role with ACTIVE status)
        long activeOfficers = users.countByRoleAndStatus(UserRole.OFFICER, UserStatus.ACTIVE);

        return new PublicStatsResponse(
            casesReported,
            childrenRescued,
            ongoingRehabilitation,
            activeOfficers
        );
    }

    @Transactional
    public ContactResponse submitContactForm(ContactRequest request) {
        Contact contact = new Contact();
        contact.setName(request.name());
        contact.setEmail(request.email());
        contact.setMessage(request.message());
        
        Contact saved = contacts.save(contact);
        
        return new ContactResponse(
            "Thank you for reaching out! We'll review your message shortly.",
            saved.getEmail(),
            saved.getSubmittedAt(),
            saved.getStatus().name()
        );
    }
}
