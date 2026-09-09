package com.clrms.repository;

import com.clrms.entity.CaseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseAssignmentRepository extends JpaRepository<CaseAssignment, Long> {
    Optional<CaseAssignment> findFirstByCaseReportIdOrderByAssignedAtDesc(Long caseReportId);
    List<CaseAssignment> findByAssignedOfficerIdOrderByAssignedAtDesc(Long assignedOfficerId);
    boolean existsByCaseReportIdAndAssignedOfficerId(Long caseReportId, Long assignedOfficerId);
}