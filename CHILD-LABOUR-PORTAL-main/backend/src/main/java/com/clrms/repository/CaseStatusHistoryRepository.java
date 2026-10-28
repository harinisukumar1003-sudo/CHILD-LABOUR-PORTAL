package com.clrms.repository;

import com.clrms.entity.CaseStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseStatusHistoryRepository extends JpaRepository<CaseStatusHistory, Long> {
    List<CaseStatusHistory> findByCaseReportIdOrderByCreatedAtAscIdAsc(Long caseReportId);
}
