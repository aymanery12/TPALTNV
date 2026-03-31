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

    @Query(value = """
            SELECT sm.id, sm.type, sm.quantity, sm.stock_before, sm.stock_after,
                   sm.reason, sm.performed_by, sm.created_at, b.id AS book_id, b.title AS book_title
            FROM stock_movements sm
            LEFT JOIN book b ON sm.book_id = b.id
            ORDER BY sm.created_at DESC
            LIMIT 20
            """, nativeQuery = true)
    List<Object[]> findTop20Raw();

    @Query("SELECT s FROM StockMovement s WHERE s.createdAt >= :since ORDER BY s.createdAt DESC")
    List<StockMovement> findRecentMovements(@Param("since") LocalDateTime since);

    @Query("SELECT SUM(s.quantity) FROM StockMovement s WHERE s.book.id = :bookId AND s.type = 'SALE'")
    Integer sumSalesByBookId(@Param("bookId") Long bookId);
}