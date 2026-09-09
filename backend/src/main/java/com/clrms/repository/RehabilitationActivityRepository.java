package com.clrms.repository;

import com.clrms.entity.RehabilitationActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface RehabilitationActivityRepository extends JpaRepository<RehabilitationActivity, Long> {
    List<RehabilitationActivity> findByRehabilitationCaseIdOrderByActivityDateAscIdAsc(Long rehabilitationCaseId);
    List<RehabilitationActivity> findByNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(LocalDate date);
    List<RehabilitationActivity> findByRehabilitationCaseIdAndNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(Long rehabilitationCaseId, LocalDate date);
}