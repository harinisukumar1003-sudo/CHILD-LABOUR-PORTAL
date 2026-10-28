package com.clrms.config;

import com.clrms.entity.CaseReport;
import com.clrms.entity.CaseStatus;
import com.clrms.entity.UrgencyLevel;
import com.clrms.repository.CaseReportRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.LocalDate;

@Configuration
@Profile("demo")
public class DemoCaseConfiguration {
    static final String CASE_NUMBER = "CLR-2026-000001";
    static final String TRACKING_CODE = "DEMO2026TRACK001";

    @Bean
    CommandLineRunner seedDemoCase(CaseReportRepository reports) {
        return args -> {
            if (reports.existsByCaseNumber(CASE_NUMBER)) return;

            CaseReport report = new CaseReport();
            report.setCaseNumber(CASE_NUMBER);
            report.setTrackingCode(TRACKING_CODE);
            report.setAnonymous(true);
            report.setApproxAge(12);
            report.setGender("Not specified");
            report.setChildDescription("Synthetic information for demonstrating case tracking.");
            report.setLocationAddress("Demo location, Pune");
            report.setDistrict("Pune");
            report.setState("Maharashtra");
            report.setIncidentDescription("Synthetic demo report created to demonstrate the public case tracking flow.");
            report.setDateOfIncident(LocalDate.now().minusDays(2));
            report.setUrgencyLevel(UrgencyLevel.MEDIUM);
            report.setStatus(CaseStatus.REPORTED);
            reports.save(report);
        };
    }
}
