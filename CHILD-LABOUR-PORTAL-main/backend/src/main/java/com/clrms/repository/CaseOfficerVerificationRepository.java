package com.clrms.repository;

import com.clrms.entity.CaseOfficerVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseOfficerVerificationRepository extends JpaRepository<CaseOfficerVerification, Long> {
    Optional<CaseOfficerVerification> findFirstByCaseReportIdOrderByCreatedAtDesc(Long caseReportId);
    List<CaseOfficerVerification> findByCaseReportIdOrderByCreatedAtAsc(Long caseReportId);
    boolean existsByCaseReportId(Long caseReportId);
}
