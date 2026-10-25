package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.ContactRequest;
import com.clrms.dto.ContactResponse;
import com.clrms.dto.PublicStatsResponse;
import com.clrms.service.PublicApiService;
import com.clrms.service.LocationDirectory;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicApiController {
    private final PublicApiService service;
    private final LocationDirectory locations;

    public PublicApiController(PublicApiService service, LocationDirectory locations) {
        this.service = service;
        this.locations = locations;
    }

    @GetMapping("/locations")
    public Map<String, List<String>> getLocations() {
        return locations.getStatesAndDistricts();
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
