package com.clrms.repository;

import com.clrms.entity.CaseInvestigationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseInvestigationLogRepository extends JpaRepository<CaseInvestigationLog, Long> {
    List<CaseInvestigationLog> findByCaseReportIdOrderByCreatedAtAsc(Long caseReportId);
}