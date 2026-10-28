package com.clrms.repository;

import com.clrms.entity.NgoOrganization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NgoOrganizationRepository extends JpaRepository<NgoOrganization, Long> {
    Optional<NgoOrganization> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
