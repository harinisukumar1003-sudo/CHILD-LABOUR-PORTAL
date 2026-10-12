package com.clrms.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception exception, HttpServletRequest request) {
        logger.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), exception);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
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

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleUploadTooLarge(MaxUploadSizeExceededException exception, HttpServletRequest request) {
        boolean audioUpload = request.getRequestURI().endsWith("/evidence/audio");
        String message = audioUpload ? "Audio evidence must be at most 5MB." : "Each evidence file must be at most 10MB.";
        Map<String, Object> body = errorBody(HttpStatus.BAD_REQUEST, message, request);
        body.put("fieldErrors", Map.of(audioUpload ? "file" : "files", message));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException exception, HttpServletRequest request) {
        return response(HttpStatus.valueOf(exception.getStatusCode().value()), exception.getReason(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status.value()).body(errorBody(status, message, request));
    }

    private Map<String, Object> errorBody(HttpStatus status, String message, HttpServletRequest request) {
        @SuppressWarnings("null")
        Map<String, Object> result = new LinkedHashMap<>(Map.of("timestamp", Instant.now(), "status", status.value(),
                "error", status.getReasonPhrase(), "message", message == null ? "Unexpected error" : message,
                "path", request.getRequestURI()));
        return result;
    }
}
