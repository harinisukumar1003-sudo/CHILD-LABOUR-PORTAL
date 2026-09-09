package com.clrms.controller;

import com.clrms.dto.ApiResponse;
import com.clrms.dto.NotificationResponse;
import com.clrms.service.NotificationService;
import com.clrms.service.NotificationService.AuthenticationUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }
    @GetMapping @PreAuthorize("isAuthenticated()") public ApiResponse<Page<NotificationResponse>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, Authentication authentication) { Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt")); return ApiResponse.success("Notifications retrieved", service.list(user(authentication), pageable)); }
    @PutMapping("/{id}/read") @PreAuthorize("isAuthenticated()") public ApiResponse<NotificationResponse> read(@PathVariable Long id, Authentication authentication) { return ApiResponse.success("Notification marked as read", service.markRead(id, user(authentication))); }
    @PutMapping("/read-all") @PreAuthorize("isAuthenticated()") public ApiResponse<Integer> readAll(Authentication authentication) { return ApiResponse.success("Notifications marked as read", service.markAllRead(user(authentication))); }
    @GetMapping("/unread-count") @PreAuthorize("isAuthenticated()") public ApiResponse<Long> unreadCount(Authentication authentication) { return ApiResponse.success("Unread count retrieved", service.unreadCount(user(authentication))); }
    private AuthenticationUser user(Authentication authentication) { try { return new AuthenticationUser(Long.valueOf(authentication.getName())); } catch (Exception ignored) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Authenticated user id is required"); } }
}