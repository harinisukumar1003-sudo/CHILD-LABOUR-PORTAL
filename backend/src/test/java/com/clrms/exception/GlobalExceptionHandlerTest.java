package com.clrms.exception;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalExceptionHandlerTest {
    @Test
    void includesFieldNameInValidationMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reports");
        String expectedMessage = "At least one photo is required as evidence";
        FieldValidationException exception = new FieldValidationException(expectedMessage,
                Map.of("files", expectedMessage));

        Map<String, Object> body = handler.handleFieldValidation(exception, request).getBody();

        assertTrue(body.get("message").equals(expectedMessage));
        assertTrue(((Map<?, ?>) body.get("fieldErrors")).get("files").equals(expectedMessage));
    }
}
