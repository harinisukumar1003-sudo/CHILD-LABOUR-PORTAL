package com.clrms.repository;

import com.clrms.entity.RehabilitationCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RehabilitationCaseRepository extends JpaRepository<RehabilitationCase, Long> {
    Optional<RehabilitationCase> findByCaseReportId(Long caseReportId);
    boolean existsByCaseReportId(Long caseReportId);
}