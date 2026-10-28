package com.clrms.service;

import com.clrms.entity.CaseStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CaseStatusTransitionServiceTest {
    private final CaseStatusTransitionService service = new CaseStatusTransitionService();

    @Test
    void rejectsDirectJumpFromReportedToClosed() {
        assertThrows(IllegalArgumentException.class,
                () -> service.validate(CaseStatus.REPORTED, CaseStatus.CLOSED, "close"));
    }

    @Test
    void requiresReasonWhenRejecting() {
        assertThrows(IllegalArgumentException.class,
                () -> service.validate(CaseStatus.UNDER_REVIEW, CaseStatus.REJECTED, " "));
    }

    @Test
    void acceptsValidTransitionWithRemarks() {
        assertDoesNotThrow(() -> service.validate(CaseStatus.REPORTED, CaseStatus.UNDER_REVIEW, "Reviewed"));
    }
}