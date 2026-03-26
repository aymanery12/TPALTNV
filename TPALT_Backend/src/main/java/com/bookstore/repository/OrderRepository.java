package com.bookstore.repository;

import com.bookstore.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserId(Long userId);

    long countByStatus(String status);

    List<Order> findFirst10ByOrderByOrderDateDesc();

    @Query("SELECT SUM(o.totalAmount) FROM Order o")
    Double sumTotalAmount();
}