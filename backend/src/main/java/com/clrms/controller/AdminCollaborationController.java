package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.CollaborationStatusUpdateRequest;
import com.clrms.dto.CollaborationSubmissionAdminResponse;
import com.clrms.entity.CollaborationType;
import com.clrms.service.CollaborationSubmissionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.clrms.entity.Contact;
import com.clrms.repository.ContactRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/collaborations")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCollaborationController {
    private final CollaborationSubmissionService service;
    private final ContactRepository contactRepository;

    public AdminCollaborationController(CollaborationSubmissionService service, ContactRepository contactRepository) {
        this.service = service;
        this.contactRepository = contactRepository;
    }

    @GetMapping("/volunteers")
    public ApiResponse<Page<CollaborationSubmissionAdminResponse>> volunteers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success("Volunteer applications retrieved",
                service.list(CollaborationType.VOLUNTEER, pageable(page, size)));
    }

    @GetMapping("/partnerships")
    public ApiResponse<Page<CollaborationSubmissionAdminResponse>> partnerships(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success("Partnership requests retrieved",
                service.list(CollaborationType.PARTNERSHIP, pageable(page, size)));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<CollaborationSubmissionAdminResponse> updateStatus(
            @PathVariable Long id, @Valid @RequestBody CollaborationStatusUpdateRequest request) {
        return ApiResponse.success("Collaboration submission status updated",
                service.updateStatus(id, request.status()));
    }

    @GetMapping("/contacts")
    public ApiResponse<java.util.List<Contact>> contacts() {
        return ApiResponse.success("Contact inquiries retrieved",
                contactRepository.findAll(Sort.by(Sort.Direction.DESC, "submittedAt")));
    }

    @PutMapping("/contacts/{id}/status")
    public ApiResponse<Contact> updateContactStatus(
            @PathVariable Long id, @RequestParam Contact.ContactStatus status) {
        Contact contact = contactRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact submission not found"));
        contact.setStatus(status);
        return ApiResponse.success("Contact inquiry status updated", contactRepository.save(contact));
    }

    private Pageable pageable(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "submittedAt"));
    }
}
