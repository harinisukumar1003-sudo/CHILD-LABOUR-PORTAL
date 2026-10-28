package com.clrms.repository;

import com.clrms.entity.CaseReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface CaseReportRepository extends JpaRepository<CaseReport, Long>, JpaSpecificationExecutor<CaseReport> {
    boolean existsByCaseNumber(String caseNumber);
    boolean existsByTrackingCode(String trackingCode);
    Optional<CaseReport> findByCaseNumber(String caseNumber);
    Optional<CaseReport> findByCaseNumberAndTrackingCode(String caseNumber, String trackingCode);
    java.util.List<CaseReport> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
}