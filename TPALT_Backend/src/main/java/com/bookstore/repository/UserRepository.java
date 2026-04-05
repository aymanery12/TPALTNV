package com.bookstore.repository;

import com.bookstore.model.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(:username))")
    Optional<User> findByUsernameNormalized(@Param("username") String username);

    @Query(value = "SELECT * FROM `user` WHERE LOWER(REPLACE(REPLACE(TRIM(email), '\\n', ''), '\\r', '')) = LOWER(TRIM(:email))", nativeQuery = true)
    Optional<User> findByEmailNormalized(@Param("email") String email);
}