package com.clrms.service;

import com.clrms.dto.CollaborationSubmissionAdminResponse;
import com.clrms.dto.CollaborationSubmissionResponse;
import com.clrms.dto.PartnershipRequest;
import com.clrms.dto.VolunteerApplicationRequest;
import com.clrms.entity.*;
import com.clrms.repository.CollaborationSubmissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.clrms.util.InputSanitizer.clean;

@Service
public class CollaborationSubmissionService {
    private final CollaborationSubmissionRepository submissions;

    public CollaborationSubmissionService(CollaborationSubmissionRepository submissions) {
        this.submissions = submissions;
    }

    @Transactional
    public CollaborationSubmissionResponse submitVolunteer(VolunteerApplicationRequest request) {
        CollaborationSubmission submission = new CollaborationSubmission();
        submission.setType(CollaborationType.VOLUNTEER);
        submission.setFullName(clean(request.fullName()));
        submission.setEmail(clean(request.email()));
        submission.setPhone(clean(request.phone()));
        submission.setLocation(clean(request.location()));
        submission.setAreaOfInterest(request.areaOfInterest());
        submission.setSkills(clean(request.skills()));
        submission.setMessage(clean(request.message()));
        return CollaborationSubmissionResponse.from(submissions.save(submission));
    }

    @Transactional
    public CollaborationSubmissionResponse submitPartnership(PartnershipRequest request) {
        CollaborationSubmission submission = new CollaborationSubmission();
        submission.setType(CollaborationType.PARTNERSHIP);
        submission.setOrganizationName(clean(request.organizationName()));
        submission.setOrganizationType(request.organizationType());
        submission.setFullName(clean(request.contactPerson()));
        submission.setContactPerson(clean(request.contactPerson()));
        submission.setEmail(clean(request.email()));
        submission.setPhone(clean(request.phone()));
        submission.setLocation(clean(request.location()));
        submission.setMessage(clean(request.message()));
        return CollaborationSubmissionResponse.from(submissions.save(submission));
    }

    @Transactional(readOnly = true)
    public Page<CollaborationSubmissionAdminResponse> list(CollaborationType type, Pageable pageable) {
        return submissions.findByType(type, pageable).map(CollaborationSubmissionAdminResponse::from);
    }

    @Transactional
    public CollaborationSubmissionAdminResponse updateStatus(Long id, CollaborationStatus status) {
        CollaborationSubmission submission = submissions.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Collaboration submission not found"));
        submission.setStatus(status);
        return CollaborationSubmissionAdminResponse.from(submission);
    }
}
