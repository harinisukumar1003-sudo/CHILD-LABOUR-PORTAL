package com.clrms.service;

import com.clrms.dto.*;
import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import com.clrms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Locale;

@Service
public class AuthenticationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String RESET_ACKNOWLEDGEMENT =
            "If an account matches that email, password reset instructions will be sent.";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService tokens;
    private final JavaMailSender mailSender;
    private final String frontendUrl;
    private final String fromAddress;

    public AuthenticationService(UserRepository users, PasswordEncoder passwordEncoder, JwtTokenService tokens,
                                 JavaMailSender mailSender,
                                 @Value("${app.frontend-url}") String frontendUrl,
                                 @Value("${app.mail.from:no-reply@clrms.local}") String fromAddress) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.mailSender = mailSender;
        this.frontendUrl = frontendUrl;
        this.fromAddress = fromAddress;
    }

    @Transactional
    public AuthUserResponse register(AuthRegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        UserRole role = request.role() == null ? UserRole.CITIZEN : request.role();
        if (role == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Administrator accounts cannot be self-registered.");
        }
        validatePasswordLength(request.password());

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(role);
        user.setStatus(role == UserRole.CITIZEN ? UserStatus.ACTIVE : UserStatus.PENDING);
        user.setDistrict(clean(request.district()));
        user.setOrganization(clean(request.organization()));
        user.setDesignation(clean(request.designation()));
        User saved = users.save(user);
        return AuthUserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public AuthSessionResponse login(AuthLoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    user.getStatus() == UserStatus.PENDING
                            ? "Your account is awaiting administrator approval."
                            : "This account is not active. Contact a CLRMS administrator.");
        }
        return new AuthSessionResponse(tokens.create(user), AuthUserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse currentUser(String userId) {
        return AuthUserResponse.from(users.findById(Objects.requireNonNull(parseUserId(userId)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found.")));
    }

    @Transactional
    public String requestPasswordReset(ForgotPasswordRequest request) {
        users.findByEmailIgnoreCase(request.email().trim())
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> {
                    byte[] random = new byte[32];
                    RANDOM.nextBytes(random);
                    String resetToken = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
                    user.setPasswordResetTokenHash(hash(resetToken));
                    user.setPasswordResetExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
                    users.save(user);

                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(fromAddress);
                    message.setTo(user.getEmail());
                    message.setSubject("Reset your CLRMS password");
                    message.setText("Use this one-time link within 30 minutes to reset your CLRMS password:\n\n"
                            + frontendUrl + "/reset-password/" + resetToken
                            + "\n\nIf you did not request this, you can ignore this message.");
                    mailSender.send(message);
                });
        return RESET_ACKNOWLEDGEMENT;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        validatePasswordLength(request.password());
        User user = users.findByPasswordResetTokenHash(hash(request.token()))
                .filter(candidate -> candidate.getPasswordResetExpiresAt() != null
                        && candidate.getPasswordResetExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This password reset link is invalid or expired. Request a new one."));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        users.save(user);
    }

    private static Long parseUserId(String userId) {
        try {
            return Long.valueOf(userId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid account identity.");
        }
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private static void validatePasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be 72 UTF-8 bytes or fewer.");
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
