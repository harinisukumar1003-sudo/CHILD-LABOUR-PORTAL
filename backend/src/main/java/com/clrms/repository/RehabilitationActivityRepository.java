package com.clrms.repository;

import com.clrms.entity.RehabilitationActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface RehabilitationActivityRepository extends JpaRepository<RehabilitationActivity, Long> {
    List<RehabilitationActivity> findByRehabilitationCaseIdOrderByActivityDateAscIdAsc(Long rehabilitationCaseId);
    List<RehabilitationActivity> findByNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(LocalDate date);
    List<RehabilitationActivity> findByRehabilitationCaseIdAndNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(Long rehabilitationCaseId, LocalDate date);
    List<RehabilitationActivity> findByRehabilitationCaseIdInAndNextFollowUpDateGreaterThanEqualOrderByNextFollowUpDateAsc(java.util.Set<Long> rehabilitationCaseIds, LocalDate date, Pageable pageable);
    long countByRehabilitationCaseIdInAndNextFollowUpDate(java.util.Set<Long> rehabilitationCaseIds, LocalDate date);
}
