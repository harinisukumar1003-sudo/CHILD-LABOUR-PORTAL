package com.clrms.service;

import com.clrms.dto.PartnershipRequest;
import com.clrms.dto.VolunteerApplicationRequest;
import com.clrms.entity.CollaborationStatus;
import com.clrms.entity.CollaborationSubmission;
import com.clrms.entity.CollaborationType;
import com.clrms.entity.OrganizationType;
import com.clrms.entity.VolunteerInterest;
import com.clrms.repository.CollaborationSubmissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CollaborationSubmissionServiceTest {
    @Mock
    private CollaborationSubmissionRepository submissions;

    @InjectMocks
    private CollaborationSubmissionService service;

    @Test
    void persistsVolunteerApplicationAndReturnsSavedConfirmation() {
        when(submissions.save(any(CollaborationSubmission.class))).thenAnswer(invocation -> saved(invocation.getArgument(0)));
        VolunteerApplicationRequest request = new VolunteerApplicationRequest(
                "Asha Rao", "asha@example.org", "+91 9876543210", "Pune",
                VolunteerInterest.AWARENESS_CAMPAIGNS, "Community outreach", "Available on weekends");

        var response = service.submitVolunteer(request);

        ArgumentCaptor<CollaborationSubmission> captor = ArgumentCaptor.forClass(CollaborationSubmission.class);
        verify(submissions).save(captor.capture());
        assertEquals(CollaborationType.VOLUNTEER, captor.getValue().getType());
        assertEquals(request.fullName(), captor.getValue().getFullName());
        assertEquals(request.areaOfInterest(), captor.getValue().getAreaOfInterest());
        assertEquals(11L, response.id());
        assertEquals(CollaborationStatus.PENDING, response.status());
    }

    @Test
    void persistsPartnershipRequestAndReturnsSavedConfirmation() {
        when(submissions.save(any(CollaborationSubmission.class))).thenAnswer(invocation -> saved(invocation.getArgument(0)));
        PartnershipRequest request = new PartnershipRequest(
                "Helping Hands", OrganizationType.NGO, "Maya Sen", "maya@example.org",
                "+91 9876543210", "Delhi", "We would like to coordinate rehabilitation services.");

        var response = service.submitPartnership(request);

        ArgumentCaptor<CollaborationSubmission> captor = ArgumentCaptor.forClass(CollaborationSubmission.class);
        verify(submissions).save(captor.capture());
        assertEquals(CollaborationType.PARTNERSHIP, captor.getValue().getType());
        assertEquals(request.organizationName(), captor.getValue().getOrganizationName());
        assertEquals(request.contactPerson(), captor.getValue().getContactPerson());
        assertEquals(request.message(), captor.getValue().getMessage());
        assertEquals(11L, response.id());
        assertEquals(CollaborationStatus.PENDING, response.status());
    }

    private CollaborationSubmission saved(CollaborationSubmission submission) {
        submission.setId(11L);
        submission.setStatus(CollaborationStatus.PENDING);
        submission.setSubmittedAt(LocalDateTime.now());
        return submission;
    }
}
