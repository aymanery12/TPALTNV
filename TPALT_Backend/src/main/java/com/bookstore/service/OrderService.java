package com.bookstore.service;

import com.bookstore.model.Book;
import com.bookstore.model.Order;
import com.bookstore.model.StockMovement;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.OrderRepository;
import com.bookstore.repository.StockMovementRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class OrderService {

    private static final ZoneId APP_ZONE = ZoneId.of("Europe/Paris");

    private final OrderRepository orderRepository;
    private final BookRepository bookRepository;
    private final StockMovementRepository stockMovementRepository;
    private final EmailService emailService;

    public OrderService(OrderRepository orderRepository,
                        BookRepository bookRepository,
                        StockMovementRepository stockMovementRepository,
                        EmailService emailService) {
        this.orderRepository = orderRepository;
        this.bookRepository = bookRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Order createOrder(Order order) {
        order.setPaymentMethod("COD");
        order.setStatus("EN_PREPARATION");
        order.setOrderDate(LocalDateTime.now(APP_ZONE));

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Commande vide");
        }

        // Calcul automatique du total
        double total = 0;
        for (var item : order.getItems()) {
            item.setOrder(order); // lien bidirectionnel

            if (item.getBook() == null || item.getBook().getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Livre manquant dans la commande");
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantite invalide dans la commande");
            }

            total += item.getPrice() * item.getQuantity();
        }

        order.setTotalAmount(total);

        // Save first to obtain the order id used in stock movement logs.
        Order savedOrder = orderRepository.save(order);

        for (var item : savedOrder.getItems()) {
            Long bookId = item.getBook().getId();
            Book book = bookRepository.findById(bookId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livre introuvable: " + bookId));

            int stockBefore = book.getQuantity() != null ? book.getQuantity() : 0;
            int qty = item.getQuantity();

            int updated = bookRepository.decrementStock(bookId, qty);
            if (updated == 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Stock insuffisant pour le livre: " + book.getTitle()
                );
            }

            Book updatedBook = bookRepository.findById(bookId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livre introuvable: " + bookId));

            int stockAfter = updatedBook.getQuantity() != null ? updatedBook.getQuantity() : 0;

            Integer soldCount = updatedBook.getSoldCount() != null ? updatedBook.getSoldCount() : 0;
            updatedBook.setSoldCount(soldCount + qty);
            if (stockAfter <= 0) {
                updatedBook.setStatus(Book.BookStatus.OUT_OF_STOCK);
            }
            bookRepository.save(updatedBook);

            StockMovement movement = new StockMovement();
            movement.setBook(updatedBook);
            movement.setType(StockMovement.MovementType.SALE);
            movement.setQuantity(qty);
            movement.setStockBefore(stockBefore);
            movement.setStockAfter(stockAfter);
            movement.setReason("Vente commande #" + savedOrder.getId());
            movement.setOrderId(savedOrder.getId());
            stockMovementRepository.save(movement);
        }

        emailService.sendOrderConfirmation(savedOrder);

        return savedOrder;
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersByUserId(Long userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        // Force l'initialisation des collections EAGER dans la transaction
        // (nécessaire avec open-in-view=false)
        orders.forEach(o -> {
            if (o.getItems() != null) {
                o.getItems().forEach(item -> {
                    if (item.getBook() != null) {
                        item.getBook().getAuthor().size(); // init ElementCollection
                    }
                });
            }
        });
        return orders;
    }

    @Transactional(readOnly = true)
    public Order getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commande introuvable"));
        // Force l'initialisation de toutes les collections dans la transaction
        if (order.getItems() != null) {
            order.getItems().forEach(item -> {
                if (item.getBook() != null) {
                    item.getBook().getAuthor().size();
                }
            });
        }
        return order;
    }

    public Order updateStatus(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commande introuvable"));
        order.setStatus(newStatus);
        return orderRepository.save(order);
    }
}