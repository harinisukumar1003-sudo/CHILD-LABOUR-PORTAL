package com.clrms.repository;

import com.clrms.entity.OfficerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OfficerProfileRepository extends JpaRepository<OfficerProfile, Long> {
    Optional<OfficerProfile> findByUserId(Long userId);
    Optional<OfficerProfile> findByAssignedStateIgnoreCase(String assignedState);
}
