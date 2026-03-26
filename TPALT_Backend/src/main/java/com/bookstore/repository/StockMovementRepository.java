package com.bookstore.repository;

import com.bookstore.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByBookIdOrderByCreatedAtDesc(Long bookId);

    List<StockMovement> findTop20ByOrderByCreatedAtDesc();

    @Query("SELECT s FROM StockMovement s WHERE s.createdAt >= :since ORDER BY s.createdAt DESC")
    List<StockMovement> findRecentMovements(@Param("since") LocalDateTime since);

    @Query("SELECT SUM(s.quantity) FROM StockMovement s WHERE s.book.id = :bookId AND s.type = 'SALE'")
    Integer sumSalesByBookId(@Param("bookId") Long bookId);
}