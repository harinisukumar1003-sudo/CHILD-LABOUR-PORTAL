package com.clrms.validation;

import com.clrms.dto.CaseReportRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public class CaseReportSubmissionValidator implements ConstraintValidator<ValidCaseReportSubmission, CaseReportRequest> {
    @Override
    public boolean isValid(CaseReportRequest request, ConstraintValidatorContext context) {
        if (request == null) return true;

        boolean valid = true;
        context.disableDefaultConstraintViolation();

        List<MultipartFile> files = request.getFiles();
        if (files == null || files.stream().noneMatch(file -> file != null && !file.isEmpty())) {
            addViolation(context, "files", "Attach at least one evidence file (image, video, document, or audio).");
            valid = false;
        }
        if (request.getChildDescription() != null && request.getChildDescription().trim().length() < 20) {
            addViolation(context, "childDescription", "Child description must be at least 20 characters.");
            valid = false;
        }
        if (request.getIncidentDescription() != null && request.getIncidentDescription().trim().length() < 30) {
            addViolation(context, "incidentDescription", "Incident description must be at least 30 characters.");
            valid = false;
        }

        if (!request.isAnonymous()) {
            if (request.getReporterName() == null || request.getReporterName().isBlank()) {
                addViolation(context, "reporterName", "Reporter name is required unless the report is anonymous.");
                valid = false;
            }
            boolean hasEmail = request.getReporterEmail() != null && !request.getReporterEmail().isBlank();
            boolean hasPhone = request.getReporterPhone() != null && !request.getReporterPhone().isBlank();
            if (!hasEmail && !hasPhone) {
                addViolation(context, "reporterEmail", "Provide a reporter phone number or email address.");
                addViolation(context, "reporterPhone", "Provide a reporter phone number or email address.");
                valid = false;
            }
        }
        return valid;
    }

    private void addViolation(ConstraintValidatorContext context, String field, String message) {
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation();
    }
}
