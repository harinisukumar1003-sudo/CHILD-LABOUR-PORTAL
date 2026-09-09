package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.service.RehabilitationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rehabilitation")
@PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')")
public class RehabilitationController {
    private final RehabilitationService service;
    public RehabilitationController(RehabilitationService service) { this.service = service; }

    @PostMapping @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<RehabilitationCaseResponse> create(@Valid @RequestBody RehabilitationCaseRequest request, Authentication authentication) { return ApiResponse.success("Rehabilitation case created", service.create(request, authentication)); }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<RehabilitationCaseResponse> get(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Rehabilitation case retrieved", service.get(id, authentication)); }
    @GetMapping("/{id}/identity") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<RehabilitationIdentityResponse> identity(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Sensitive identity retrieved", service.identity(id, authentication)); }
    @PostMapping("/{id}/activities") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<RehabilitationActivityResponse> addActivity(@PathVariable Long id, @Valid @RequestBody RehabilitationActivityRequest request, Authentication authentication) { return ApiResponse.success("Rehabilitation activity recorded", service.addActivity(id, request, authentication)); }
    @GetMapping("/{id}/activities") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<List<RehabilitationActivityResponse>> activities(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Rehabilitation activities retrieved", service.activities(id, authentication)); }
    @PutMapping("/{id}/phase") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<RehabilitationCaseResponse> phase(@PathVariable Long id, @Valid @RequestBody RehabilitationPhaseRequest request, Authentication authentication) { return ApiResponse.success("Rehabilitation phase updated", service.updatePhase(id, request, authentication)); }
    @GetMapping("/{id}/follow-ups/due") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<List<RehabilitationActivityResponse>> due(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Due follow-ups retrieved", service.dueFollowUps(id, authentication)); }

    @GetMapping("/centers") @PreAuthorize("hasAnyRole('NGO_STAFF', 'OFFICER', 'ADMIN')") public ApiResponse<List<RehabilitationCenterResponse>> centers(Authentication authentication) { return ApiResponse.success("Rehabilitation centers retrieved", service.listCenters(authentication)); }
    @PostMapping("/centers") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<RehabilitationCenterResponse> createCenter(@Valid @RequestBody RehabilitationCenterRequest request, Authentication authentication) { return ApiResponse.success("Rehabilitation center created", service.createCenter(request, authentication)); }
    @PutMapping("/centers/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<RehabilitationCenterResponse> updateCenter(@PathVariable Long id, @Valid @RequestBody RehabilitationCenterRequest request, Authentication authentication) { return ApiResponse.success("Rehabilitation center updated", service.updateCenter(id, request, authentication)); }
    @DeleteMapping("/centers/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Void> deleteCenter(@PathVariable Long id, Authentication authentication) { service.deleteCenter(id, authentication); return ApiResponse.success("Rehabilitation center deleted", null); }
}