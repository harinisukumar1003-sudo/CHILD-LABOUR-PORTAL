package com.clrms.validation;

import com.clrms.dto.CaseReportRequest;
import com.clrms.entity.UrgencyLevel;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

class CaseReportSubmissionValidatorTest {
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void requiresReportFieldsEvidenceAndReporterContact() {
        Set<String> fields = validator.validate(new CaseReportRequest()).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());

        assertTrue(fields.containsAll(Set.of("approxAge", "gender", "childDescription", "locationAddress",
                "townOrCity", "pincode", "district", "state", "incidentDescription", "dateOfIncident", "urgencyLevel",
                "reporterName", "reporterEmail", "reporterPhone")));
    }

    @Test
    void acceptsAnonymousReportWithEvidenceAndRequiredReportDetails() {
        CaseReportRequest request = validRequest();
        request.setAnonymous(true);
        request.setReporterName(null);
        request.setReporterEmail(null);
        request.setReporterPhone(null);

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsDescriptionsThatOnlyReachMinimumLengthWithWhitespace() {
        CaseReportRequest request = validRequest();
        request.setChildDescription("                   a");

        Set<String> fields = validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());

        assertTrue(fields.contains("childDescription"));
    }

    @Test
    void rejectsDistrictThatDoesNotBelongToSelectedState() {
        CaseReportRequest request = validRequest();
        request.setDistrict("Hyderabad");

        assertTrue(validator.validate(request).stream()
                .anyMatch(violation -> violation.getPropertyPath().toString().equals("district")
                        && violation.getMessage().contains("belong to the selected state")));
    }

    @Test
    void acceptsDistrictFromCompleteStateDirectory() {
        CaseReportRequest request = validRequest();
        request.setState("Tamil Nadu");
        request.setDistrict("Ariyalur");

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsInvalidTownNameAndPincode() {
        CaseReportRequest request = validRequest();
        request.setTownOrCity("Pune 411");
        request.setPincode("012345");

        Set<String> fields = validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());

        assertTrue(fields.containsAll(Set.of("townOrCity", "pincode")));
    }

    private CaseReportRequest validRequest() {
        CaseReportRequest request = new CaseReportRequest();
        request.setReporterName("Reporter");
        request.setReporterEmail("reporter@example.org");
        request.setApproxAge(10);
        request.setGender("Female");
        request.setChildDescription("Child has short hair and wears a blue uniform.");
        request.setLocationAddress("Near the market entrance");
        request.setTownOrCity("Pune");
        request.setDistrict("Pune");
        request.setState("Maharashtra");
        request.setPincode("411001");
        request.setIncidentDescription("The child has been seen working at the stall every evening.");
        request.setDateOfIncident(LocalDate.now().minusDays(1));
        request.setUrgencyLevel(UrgencyLevel.MEDIUM);
        return request;
    }
}
