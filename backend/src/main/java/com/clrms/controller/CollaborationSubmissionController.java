package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.CollaborationSubmissionResponse;
import com.clrms.dto.PartnershipRequest;
import com.clrms.dto.VolunteerApplicationRequest;
import com.clrms.service.CollaborationSubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class CollaborationSubmissionController {
    private final CollaborationSubmissionService service;

    public CollaborationSubmissionController(CollaborationSubmissionService service) {
        this.service = service;
    }

    @PostMapping("/volunteer-applications")
    public ResponseEntity<ApiResponse<CollaborationSubmissionResponse>> submitVolunteer(
            @Valid @RequestBody VolunteerApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Volunteer application submitted", service.submitVolunteer(request)));
    }

    @PostMapping("/partnership-requests")
    public ResponseEntity<ApiResponse<CollaborationSubmissionResponse>> submitPartnership(
            @Valid @RequestBody PartnershipRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Partnership request submitted", service.submitPartnership(request)));
    }
}
