package com.bookstore.repository;

import com.bookstore.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {

    Optional<VerificationCode> findTopByEmailAndTypeAndUsedFalseOrderByExpiresAtDesc(
            String email, String type);

    @Modifying
    @Transactional
    @Query("DELETE FROM VerificationCode v WHERE v.expiresAt < :now")
    void deleteExpired(LocalDateTime now);
}