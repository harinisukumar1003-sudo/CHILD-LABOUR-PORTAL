package com.clrms.validation;

import com.clrms.dto.CaseReportRequest;
import com.clrms.service.LocationDirectory;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class CaseReportSubmissionValidator implements ConstraintValidator<ValidCaseReportSubmission, CaseReportRequest> {
    private final LocationDirectory locations;

    @Autowired
    public CaseReportSubmissionValidator(LocationDirectory locations) {
        this.locations = locations;
    }

    public CaseReportSubmissionValidator() {
        this(new LocationDirectory());
    }

    @Override
    public boolean isValid(CaseReportRequest request, ConstraintValidatorContext context) {
        if (request == null) return true;

        boolean valid = true;
        context.disableDefaultConstraintViolation();

        if (request.getChildDescription() != null && request.getChildDescription().trim().length() < 20) {
            addViolation(context, "childDescription", "Child description must be at least 20 characters.");
            valid = false;
        }
        if (request.getIncidentDescription() != null && request.getIncidentDescription().trim().length() < 30) {
            addViolation(context, "incidentDescription", "Incident description must be at least 30 characters.");
            valid = false;
        }
        if (request.getState() != null && !request.getState().isBlank()
                && request.getDistrict() != null && !request.getDistrict().isBlank()
                && !locations.containsDistrict(request.getState(), request.getDistrict())) {
            addViolation(context, "district", "District must belong to the selected state.");
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
