package com.clrms.repository;

import com.clrms.entity.CollaborationSubmission;
import com.clrms.entity.CollaborationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollaborationSubmissionRepository extends JpaRepository<CollaborationSubmission, Long> {
    Page<CollaborationSubmission> findByType(CollaborationType type, Pageable pageable);
}
