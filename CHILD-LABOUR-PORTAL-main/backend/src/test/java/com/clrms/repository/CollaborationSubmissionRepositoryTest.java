package com.clrms.repository;

import com.clrms.entity.CollaborationStatus;
import com.clrms.entity.CollaborationSubmission;
import com.clrms.entity.CollaborationType;
import com.clrms.entity.OrganizationType;
import com.clrms.entity.VolunteerInterest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest
class CollaborationSubmissionRepositoryTest {
    @Autowired
    private CollaborationSubmissionRepository submissions;

    @Test
    void savesAndLoadsVolunteerSubmissionFromDatabase() {
        CollaborationSubmission submission = new CollaborationSubmission();
        submission.setType(CollaborationType.VOLUNTEER);
        submission.setFullName("Asha Rao");
        submission.setEmail("asha@example.org");
        submission.setPhone("+91 9876543210");
        submission.setLocation("Pune");
        submission.setAreaOfInterest(VolunteerInterest.AWARENESS_CAMPAIGNS);
        submission.setStatus(CollaborationStatus.PENDING);

        CollaborationSubmission saved = submissions.saveAndFlush(submission);
        CollaborationSubmission loaded = submissions.findById(saved.getId()).orElseThrow();

        assertNotNull(loaded.getSubmittedAt());
        assertEquals(CollaborationType.VOLUNTEER, loaded.getType());
        assertEquals("asha@example.org", loaded.getEmail());
        assertEquals(VolunteerInterest.AWARENESS_CAMPAIGNS, loaded.getAreaOfInterest());
    }

    @Test
    void savesAndLoadsPartnershipRequestFromDatabase() {
        CollaborationSubmission submission = new CollaborationSubmission();
        submission.setType(CollaborationType.PARTNERSHIP);
        submission.setFullName("Maya Sen");
        submission.setOrganizationName("Helping Hands");
        submission.setOrganizationType(OrganizationType.NGO);
        submission.setContactPerson("Maya Sen");
        submission.setEmail("maya@example.org");
        submission.setPhone("+91 9876543210");
        submission.setLocation("Delhi");
        submission.setMessage("We would like to coordinate rehabilitation services.");
        submission.setStatus(CollaborationStatus.PENDING);

        CollaborationSubmission saved = submissions.saveAndFlush(submission);
        CollaborationSubmission loaded = submissions.findById(saved.getId()).orElseThrow();

        assertNotNull(loaded.getSubmittedAt());
        assertEquals(CollaborationType.PARTNERSHIP, loaded.getType());
        assertEquals("Helping Hands", loaded.getOrganizationName());
        assertEquals(OrganizationType.NGO, loaded.getOrganizationType());
        assertEquals("maya@example.org", loaded.getEmail());
    }
}
