package com.clrms.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception exception, HttpServletRequest request) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "Validation failed", request);
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
        @SuppressWarnings("null")
        ResponseEntity<Map<String, Object>> result = ResponseEntity.status(status).body(Map.of("timestamp", Instant.now(), "status", status.value(),
                "error", status.getReasonPhrase(), "message", message == null ? "Unexpected error" : message,
                "path", request.getRequestURI()));
        return result;
    }
}