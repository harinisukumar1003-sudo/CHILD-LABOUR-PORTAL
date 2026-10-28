package com.clrms.controller;

import com.clrms.config.SecurityConfig;
import com.clrms.dto.CaseAssignmentResponse;
import com.clrms.repository.UserRepository;
import com.clrms.service.CaseManagementService;
import com.clrms.service.JwtTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CaseManagementController.class)
@Import(SecurityConfig.class)
class CaseManagementControllerSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CaseManagementService caseManagement;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserRepository users;

    @Test
    @WithMockUser(username = "1", roles = "ADMIN")
    void adminCanAssignOfficerThroughPutEndpoint() throws Exception {
        when(caseManagement.assign(eq(12L), any(com.clrms.dto.CaseOfficerAssignmentRequest.class), any()))
                .thenReturn(new CaseAssignmentResponse(3L, 12L, 7L, 1L, Instant.parse("2026-01-01T00:00:00Z"), "Chennai", null));

        mockMvc.perform(put("/api/cases/12/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"officerId\":7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assignedOfficerId").value(7));

        verify(caseManagement).assign(eq(12L), any(com.clrms.dto.CaseOfficerAssignmentRequest.class), any());
    }

    @Test
    @WithMockUser(username = "2", roles = "OFFICER")
    void officerCannotAssignCases() throws Exception {
        mockMvc.perform(put("/api/cases/12/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"officerId\":7}"))
                .andExpect(status().isForbidden());
    }
}
