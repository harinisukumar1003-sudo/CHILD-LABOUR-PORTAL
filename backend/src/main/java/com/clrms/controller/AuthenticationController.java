package com.clrms.controller;

import com.clrms.dto.*;
import com.clrms.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {
    private final AuthenticationService authentication;

    public AuthenticationController(AuthenticationService authentication) {
        this.authentication = authentication;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthUserResponse> register(@Valid @RequestBody AuthRegisterRequest request) {
        return ApiResponse.success("Account created", authentication.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthSessionResponse> login(@Valid @RequestBody AuthLoginRequest request) {
        return ApiResponse.success("Signed in", authentication.login(request));
    }

    @GetMapping("/me")
    public ApiResponse<AuthUserResponse> currentUser(Authentication principal) {
        return ApiResponse.success("Account retrieved", authentication.currentUser(principal.getName()));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ApiResponse.success("Password recovery requested", authentication.requestPasswordReset(request));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authentication.resetPassword(request);
        return ApiResponse.success("Password updated", null);
    }
}
