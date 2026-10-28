package com.clrms.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        String detailedMessage = exception.getMessage() != null && !exception.getMessage().isBlank()
                ? exception.getMessage()
                : "An unexpected error occurred. Please try again or contact support.";
        Map<String, Object> body = errorBody(HttpStatus.INTERNAL_SERVER_ERROR, detailedMessage, request);
        body.put("fieldErrors", Map.of("request", detailedMessage));
        return ResponseEntity.internalServerError().body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        log.error("Validation failed for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()));
        exception.getBindingResult().getGlobalErrors().forEach(error ->
                fieldErrors.putIfAbsent(error.getObjectName(), error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()));
        String details = fieldErrors.entrySet().stream()
                .map(error -> error.getKey() + ": " + error.getValue())
                .collect(Collectors.joining("; "));
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST,
                details.isBlank() ? "Validation failed" : "Validation failed: " + details, request);
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintValidation(ConstraintViolationException exception, HttpServletRequest request) {
        log.error("Constraint validation failed for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getConstraintViolations().forEach(violation -> {
            String path = violation.getPropertyPath().toString();
            String field = path.substring(path.lastIndexOf('.') + 1).replaceAll("\\[.*$", "");
            fieldErrors.putIfAbsent(field, violation.getMessage());
        });
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST, messageWithFields("Validation failed", fieldErrors), request);
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<Map<String, Object>> handleFieldValidation(FieldValidationException exception, HttpServletRequest request) {
        log.error("Field validation failed for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST,
                exception.getMessage(), request);
        body.put("fieldErrors", exception.getFieldErrors() != null ? exception.getFieldErrors() : Map.of("request", exception.getMessage()));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleUploadTooLarge(MaxUploadSizeExceededException exception, HttpServletRequest request) {
        log.error("Upload exceeded configured size for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        boolean audioUpload = request.getRequestURI().endsWith("/evidence/audio");
        String field = audioUpload ? "file" : "files";
        String message = field + ": " + (audioUpload ? "Audio evidence must be at most 5MB." : "Each evidence file must be at most 10MB.");
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST, message, request);
        body.put("fieldErrors", Map.of(field, message.substring(field.length() + 2)));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException exception, HttpServletRequest request) {
        log.error("Request rejected ({}) for {} {}: {}", exception.getStatusCode(), request.getMethod(), request.getRequestURI(), exception.getReason(), exception);
        String reason = exception.getReason() != null ? exception.getReason() : exception.getStatusCode().toString();
        Map<String, Object> body = errorBody(HttpStatus.valueOf(exception.getStatusCode().value()), reason, request);
        body.put("fieldErrors", Map.of("request", reason));
        return ResponseEntity.status(exception.getStatusCode()).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        log.error("Access denied for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        String msg = "Access denied. You do not have permission to perform this action.";
        Map<String, Object> body = errorBody(HttpStatus.FORBIDDEN, msg, request);
        body.put("fieldErrors", Map.of("permission", msg));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException exception, HttpServletRequest request) {
        log.error("Authentication failed for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        String msg = "Invalid email or password.";
        Map<String, Object> body = errorBody(HttpStatus.UNAUTHORIZED, msg, request);
        body.put("fieldErrors", Map.of("credentials", msg));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException exception, HttpServletRequest request) {
        log.error("Data integrity violation for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        String msg = "Database integrity or constraint error occurred: " + (exception.getRootCause() != null ? exception.getRootCause().getMessage() : exception.getMessage());
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST, msg, request);
        body.put("fieldErrors", Map.of("database", msg));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(RuntimeException exception, HttpServletRequest request) {
        log.error("Invalid request ({}) for {} {}: {}", exception.getClass().getSimpleName(), request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        String field = request.getRequestURI().endsWith("/evidence/audio") ? "file"
                : request.getRequestURI().equals("/api/reports") ? "files" : "request";
        String fieldMessage = exception.getMessage() == null ? "Invalid request parameter" : exception.getMessage();
        Map<String, String> fieldErrors = Map.of(field, fieldMessage);
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST, fieldMessage, request);
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    private String messageWithFields(String message, Map<String, String> fieldErrors) {
        String details = fieldErrors.entrySet().stream()
                .map(error -> error.getKey() + ": " + error.getValue())
                .collect(Collectors.joining("; "));
        return details.isBlank() ? message : message + ": " + details;
    }

    private Map<String, Object> errorBody(HttpStatus status, String message, HttpServletRequest request) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("timestamp", Instant.now());
        result.put("status", status.value());
        result.put("error", status.getReasonPhrase());
        result.put("message", message == null ? "The request could not be processed" : message);
        result.put("path", request.getRequestURI());
        return result;
    }
}
