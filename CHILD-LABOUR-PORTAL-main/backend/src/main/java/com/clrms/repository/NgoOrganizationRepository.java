package com.clrms.repository;

import com.clrms.entity.NgoOrganization;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NgoOrganizationRepository extends JpaRepository<NgoOrganization, Long> {
    Optional<NgoOrganization> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
    List<NgoOrganization> findByActiveTrueOrderByNameAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ngo from NgoOrganization ngo where ngo.id = :id")
    Optional<NgoOrganization> findByIdForUpdate(@Param("id") Long id);
}
