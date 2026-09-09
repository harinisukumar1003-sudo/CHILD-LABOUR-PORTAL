package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.ContactRequest;
import com.clrms.dto.ContactResponse;
import com.clrms.dto.PublicStatsResponse;
import com.clrms.service.PublicApiService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
public class PublicApiController {
    private final PublicApiService service;

    public PublicApiController(PublicApiService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public ApiResponse<PublicStatsResponse> getPublicStats() {
        PublicStatsResponse stats = service.getPublicStats();
        return ApiResponse.success("Public statistics retrieved", stats);
    }

    @PostMapping("/contact")
    public ResponseEntity<ApiResponse<ContactResponse>> submitContact(
            @Valid @RequestBody ContactRequest request) {
        ContactResponse response = service.submitContactForm(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Contact form submitted successfully", response));
    }
}
