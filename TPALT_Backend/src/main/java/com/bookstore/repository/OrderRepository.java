package com.bookstore.repository;

import com.bookstore.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserId(Long userId);

    long countByStatus(String status);

    List<Order> findFirst10ByOrderByOrderDateDesc();

    @Query("SELECT SUM(o.totalAmount) FROM Order o")
    Double sumTotalAmount();

        @Query(value = """
                        SELECT
                            o.id,
                            o.order_date,
                            o.total_amount,
                            o.status,
                            o.shipping_address,
                            o.payment_method,
                            u.username,
                            COALESCE((SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id), 0) AS items_count
                        FROM orders o
                        LEFT JOIN `user` u ON u.id = o.user_id
                        ORDER BY o.order_date DESC
                        """, nativeQuery = true)
        List<Object[]> findAdminOrderSummaries();

        @Query(value = """
                        SELECT
                            o.id,
                            o.order_date,
                            o.total_amount,
                            o.status,
                            o.shipping_address,
                            o.payment_method,
                            u.username,
                            COALESCE((SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id), 0) AS items_count
                        FROM orders o
                        LEFT JOIN `user` u ON u.id = o.user_id
                        WHERE UPPER(o.status) = UPPER(:status)
                        ORDER BY o.order_date DESC
                        """, nativeQuery = true)
        List<Object[]> findAdminOrderSummariesByStatus(@Param("status") String status);
}