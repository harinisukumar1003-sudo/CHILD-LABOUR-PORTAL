package com.clrms.service;

import com.clrms.dto.CaseReportRequest;
import com.clrms.exception.FieldValidationException;
import com.clrms.repository.CaseReportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class CaseReportServiceTest {
    @Test
    void rejectsSubmissionWithoutPhotoEvidence() {
        CaseReportService service = new CaseReportService(
                mock(CaseReportRepository.class),
                mock(FileStorageService.class),
                mock(ApplicationEventPublisher.class));

        FieldValidationException exception = assertThrows(FieldValidationException.class,
                () -> service.create(new CaseReportRequest(), List.of(), null));

        assertEquals("At least one photo is required as evidence", exception.getMessage());
        assertEquals("At least one photo is required as evidence", exception.getFieldErrors().get("files"));
    }
}
