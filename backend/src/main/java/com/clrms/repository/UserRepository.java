package com.clrms.repository;

import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
    Page<User> findByRoleAndStatus(UserRole role, UserStatus status, Pageable pageable);
    Page<User> findByRole(UserRole role, Pageable pageable);
    Page<User> findByStatus(UserStatus status, Pageable pageable);
    long countByRoleAndStatus(UserRole role, UserStatus status);
}