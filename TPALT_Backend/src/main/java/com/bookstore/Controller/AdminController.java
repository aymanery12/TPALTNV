package com.bookstore.Controller;

import com.bookstore.model.*;
import com.bookstore.repository.*;
import com.bookstore.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Year;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final BookRepository bookRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final EmailService emailService;

    public AdminController(BookRepository bookRepository,
                           OrderRepository orderRepository,
                           UserRepository userRepository,
                           StockMovementRepository stockMovementRepository,
                           EmailService emailService) {
        this.bookRepository          = bookRepository;
        this.orderRepository         = orderRepository;
        this.userRepository          = userRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.emailService            = emailService;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DASHBOARD STATS
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        List<Book> allBooks    = bookRepository.findAll();
        long totalStock        = allBooks.stream().mapToLong(b -> b.getQuantity() != null ? b.getQuantity() : 0).sum();
        long totalBooks        = allBooks.size();
        long lowStockCount     = bookRepository.findLowStockBooks().size();
        long outOfStock        = bookRepository.findOutOfStockBooks().size();

        Double totalStockValue = bookRepository.getTotalStockValue();
        Double totalProfit     = orderRepository.sumTotalAmount();

        // ✅ Statuts alignés avec ceux réellement créés par OrderService
        long countPreparation = orderRepository.countByStatus("EN_PREPARATION");
        long countLivraison   = orderRepository.countByStatus("EXPEDIEE");
        long countLivree      = orderRepository.countByStatus("LIVREE");
        long countAnnulee     = orderRepository.countByStatus("ANNULEE");
        long totalOrders      = orderRepository.count();
        long totalUsers       = userRepository.count();

        stats.put("totalProfit",     totalProfit != null ? totalProfit : 0.0);
        stats.put("totalAchats",     totalOrders);
        stats.put("totalStock",      totalStock);
        stats.put("totalBooks",      totalBooks);
        stats.put("lowStockCount",   lowStockCount);
        stats.put("outOfStock",      outOfStock);
        stats.put("totalStockValue", totalStockValue != null ? totalStockValue : 0.0);
        stats.put("enLivraison",     countLivraison);
        stats.put("enPreparation",   countPreparation);
        stats.put("livrees",         countLivree);
        stats.put("annulees",        countAnnulee);
        stats.put("totalUsers",      totalUsers);

        List<Map<String, Object>> categoryStats = bookRepository.getCategoryStats().stream().map(row -> {
            Map<String, Object> cat = new HashMap<>();
            cat.put("category",   row[0]);
            cat.put("bookCount",  row[1]);
            cat.put("stockCount", row[2]);
            return cat;
        }).collect(Collectors.toList());
        stats.put("categoryStats", categoryStats);

        return ResponseEntity.ok(stats);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION DES LIVRES
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/books")
    public ResponseEntity<List<Book>> getAllBooks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        Book.BookStatus bookStatus = null;
        if (status != null && !status.isBlank()) {
            try { bookStatus = Book.BookStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        if ((keyword == null || keyword.isBlank()) && category == null && bookStatus == null) {
            return ResponseEntity.ok(bookRepository.findAll());
        }
        return ResponseEntity.ok(bookRepository.searchBooks(
                (keyword != null && keyword.isBlank()) ? null : keyword,
                (category != null && category.isBlank()) ? null : category,
                bookStatus
        ));
    }

    @PostMapping("/books")
    public ResponseEntity<Book> createBook(@RequestBody Book book) {
        book.setId(null);
        if (book.getPublishedYear() != null && book.getPublishedYear() > Year.now().getValue()) {
            return ResponseEntity.badRequest().build();
        }
        if (book.getStatus()     == null) book.setStatus(Book.BookStatus.ACTIVE);
        if (book.getQuantity()   == null) book.setQuantity(0);
        if (book.getStockAlert() == null) book.setStockAlert(5);
        if (book.getSoldCount()  == null) book.setSoldCount(0);
        if (book.getDiscount()   == null) book.setDiscount(0.0);
        if (book.getFeatured()   == null) book.setFeatured(false);

        Book saved = bookRepository.save(book);

        if (saved.getQuantity() > 0) {
            recordStockMovement(saved, StockMovement.MovementType.INITIAL,
                    saved.getQuantity(), 0, saved.getQuantity(), "Stock initial", null, null);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/books/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id, @RequestBody Book bookData) {
        if (bookData.getPublishedYear() != null && bookData.getPublishedYear() > Year.now().getValue()) {
            return ResponseEntity.badRequest().build();
        }
        return bookRepository.findById(id).map(existing -> {
            existing.setTitle(bookData.getTitle());
            existing.setAuthor(bookData.getAuthor());
            existing.setDescription(bookData.getDescription());
            existing.setPrice(bookData.getPrice());
            existing.setImageUrl(bookData.getImageUrl());
            existing.setCategory(bookData.getCategory());
            existing.setIsbn(bookData.getIsbn());
            existing.setPublisher(bookData.getPublisher());
            existing.setPublishedYear(bookData.getPublishedYear());
            existing.setPages(bookData.getPages());
            existing.setLanguage(bookData.getLanguage());
            existing.setQuantity(bookData.getQuantity());
            existing.setStockAlert(bookData.getStockAlert());
            existing.setFeatured(bookData.getFeatured());
            existing.setDiscount(bookData.getDiscount());
            if (bookData.getStatus() != null) existing.setStatus(bookData.getStatus());
            return ResponseEntity.ok(bookRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/books/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        if (!bookRepository.existsById(id)) return ResponseEntity.notFound().build();
        bookRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/books/{id}/status")
    public ResponseEntity<Book> updateBookStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return bookRepository.findById(id).map(book -> {
            book.setStatus(Book.BookStatus.valueOf(body.get("status").toUpperCase()));
            return ResponseEntity.ok(bookRepository.save(book));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/books/{id}/featured")
    public ResponseEntity<Book> toggleFeatured(@PathVariable Long id) {
        return bookRepository.findById(id).map(book -> {
            book.setFeatured(book.getFeatured() == null ? true : !book.getFeatured());
            return ResponseEntity.ok(bookRepository.save(book));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/books/{id}/discount")
    public ResponseEntity<Book> setDiscount(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return bookRepository.findById(id).map(book -> {
            double discount = Double.parseDouble(body.getOrDefault("discount", "0").toString());
            book.setDiscount(discount);
            return ResponseEntity.ok(bookRepository.save(book));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION DU STOCK
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/stock/low")
    public ResponseEntity<List<Book>> getLowStockBooks() {
        return ResponseEntity.ok(bookRepository.findLowStockBooks());
    }

    @GetMapping("/stock/out")
    public ResponseEntity<List<Book>> getOutOfStockBooks() {
        return ResponseEntity.ok(bookRepository.findOutOfStockBooks());
    }

    @PatchMapping("/stock/{bookId}/adjust")
    public ResponseEntity<?> adjustStock(
            @PathVariable Long bookId,
            @RequestBody Map<String, Object> body) {

        return bookRepository.findById(bookId).map(book -> {
            int qty        = Integer.parseInt(body.getOrDefault("quantity", "0").toString());
            String typeStr = body.getOrDefault("type", "RESTOCK").toString();
            String reason  = body.getOrDefault("reason", "").toString();

            StockMovement.MovementType type;
            try { type = StockMovement.MovementType.valueOf(typeStr.toUpperCase()); }
            catch (Exception e) { type = StockMovement.MovementType.CORRECTION; }

            int stockBefore = book.getQuantity() != null ? book.getQuantity() : 0;
            int stockAfter;

            if (type == StockMovement.MovementType.RESTOCK || type == StockMovement.MovementType.RETURN) {
                bookRepository.incrementStock(bookId, qty);
                stockAfter = stockBefore + qty;
            } else if (type == StockMovement.MovementType.SALE || type == StockMovement.MovementType.LOSS) {
                int updated = bookRepository.decrementStock(bookId, qty);
                if (updated == 0) return ResponseEntity.badRequest().body("Stock insuffisant.");
                stockAfter = stockBefore - qty;
            } else {
                // CORRECTION : on fixe directement
                book.setQuantity(qty);
                bookRepository.save(book);
                stockAfter = qty;
            }

            book = bookRepository.findById(bookId).orElse(book);
            if (book.getQuantity() == 0 && book.getStatus() == Book.BookStatus.ACTIVE) {
                book.setStatus(Book.BookStatus.OUT_OF_STOCK);
                bookRepository.save(book);
            } else if (book.getQuantity() > 0 && book.getStatus() == Book.BookStatus.OUT_OF_STOCK) {
                book.setStatus(Book.BookStatus.ACTIVE);
                bookRepository.save(book);
            }

            recordStockMovement(book, type, qty, stockBefore, stockAfter, reason, null, null);

            Map<String, Object> result = new HashMap<>();
            result.put("bookId",      bookId);
            result.put("title",       book.getTitle());
            result.put("stockBefore", stockBefore);
            result.put("stockAfter",  stockAfter);
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/stock/bulk-restock")
    public ResponseEntity<?> bulkRestock(@RequestBody List<Map<String, Object>> restockList) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, Object> item : restockList) {
            Long   bookId = Long.parseLong(item.get("bookId").toString());
            int    qty    = Integer.parseInt(item.get("quantity").toString());
            String note   = item.getOrDefault("reason", "Réapprovisionnement en masse").toString();
            bookRepository.findById(bookId).ifPresent(book -> {
                int before = book.getQuantity() != null ? book.getQuantity() : 0;
                bookRepository.incrementStock(bookId, qty);
                recordStockMovement(book, StockMovement.MovementType.RESTOCK, qty, before, before + qty, note, null, null);
                results.add(Map.of("bookId", bookId, "title", book.getTitle(), "added", qty, "newStock", before + qty));
            });
        }
        return ResponseEntity.ok(results);
    }

    @GetMapping("/stock/{bookId}/history")
    public ResponseEntity<List<StockMovement>> getStockHistory(@PathVariable Long bookId) {
        return ResponseEntity.ok(stockMovementRepository.findByBookIdOrderByCreatedAtDesc(bookId));
    }

    @GetMapping("/stock/recent-movements")
    public ResponseEntity<?> getRecentMovements() {
        try {
            List<Object[]> rows = stockMovementRepository.findTop20Raw();

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> dto = new LinkedHashMap<>();
                dto.put("id",          row[0]);
                dto.put("type",        row[1]);
                dto.put("quantity",    row[2]);
                dto.put("stockBefore", row[3]);
                dto.put("stockAfter",  row[4]);
                dto.put("reason",      row[5]);
                dto.put("performedBy", row[6] != null ? row[6] : "admin");
                dto.put("createdAt",   row[7] != null ? row[7].toString() : null);
                if (row[8] != null) {
                    Map<String, Object> book = new LinkedHashMap<>();
                    book.put("id",    row[8]);
                    book.put("title", row[9] != null ? row[9] : "—");
                    dto.put("book", book);
                } else {
                    dto.put("book", null);
                }
                return dto;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("RECENT-MOVEMENTS ERROR: {}: {}", e.getClass().getName(), e.getMessage(), e);
            // Return 200 with empty list so the dashboard still loads
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/stock/overview")
    public ResponseEntity<?> getStockOverview() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("low", bookRepository.findLowStockBooks());
        payload.put("out", bookRepository.findOutOfStockBooks());

        try {
            List<Object[]> rows = stockMovementRepository.findTop20Raw();

            List<Map<String, Object>> movements = rows.stream().map(row -> {
                Map<String, Object> dto = new LinkedHashMap<>();
                dto.put("id",          row[0]);
                dto.put("type",        row[1]);
                dto.put("quantity",    row[2]);
                dto.put("stockBefore", row[3]);
                dto.put("stockAfter",  row[4]);
                dto.put("reason",      row[5]);
                dto.put("performedBy", row[6] != null ? row[6] : "admin");
                dto.put("createdAt",   row[7] != null ? row[7].toString() : null);

                if (row[8] != null) {
                    Map<String, Object> book = new LinkedHashMap<>();
                    book.put("id", row[8]);
                    book.put("title", row[9] != null ? row[9] : "—");
                    dto.put("book", book);
                } else {
                    dto.put("book", null);
                }
                return dto;
            }).collect(Collectors.toList());

            payload.put("movements", movements);
        } catch (Exception e) {
            log.error("STOCK-OVERVIEW MOVEMENTS ERROR: {}: {}", e.getClass().getName(), e.getMessage(), e);
            payload.put("movements", Collections.emptyList());
        }

        return ResponseEntity.ok(payload);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION DES COMMANDES
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllOrders(@RequestParam(required = false) String status) {
        List<Object[]> rows = (status != null && !status.isBlank())
            ? orderRepository.findAdminOrderSummariesByStatus(status)
            : orderRepository.findAdminOrderSummaries();

        List<Map<String, Object>> summaries = rows.stream().map(row -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", row[0]);
            dto.put("orderDate", row[1] != null ? row[1].toString() : null);
            dto.put("totalAmount", row[2]);
            dto.put("status", row[3]);
            dto.put("shippingAddress", row[4]);
            dto.put("paymentMethod", row[5]);
            dto.put("username", row[6]);
            dto.put("itemsCount", row[7]);
            dto.put("trackingNumber", row.length > 8 ? row[8] : null);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    // ✅ Endpoint manquant — appelé par le dashboard Angular
    @GetMapping("/orders/recent")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getRecentOrders() {
        List<Order> recent = orderRepository.findAll().stream()
                .filter(o -> o.getOrderDate() != null)
                .sorted(Comparator.comparing(Order::getOrderDate).reversed())
                .limit(10)
                .collect(Collectors.toList());
        return ResponseEntity.ok(recent);
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        return orderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return orderRepository.findById(id).map(order -> {
            String newStatus = body.get("status").toUpperCase();
            String oldStatus = order.getStatus();
            order.setStatus(newStatus);

            // Auto-generate Chronopost tracking number when order is shipped
            if ("EXPEDIEE".equals(newStatus) && !"EXPEDIEE".equals(oldStatus)
                    && (order.getTrackingNumber() == null || order.getTrackingNumber().isBlank())) {
                order.setTrackingNumber(generateChronopostNumber(order.getId()));
            }

            orderRepository.save(order);

            emailService.sendOrderStatusUpdate(order, newStatus);

            if ("ANNULEE".equals(newStatus) && !"ANNULEE".equals(oldStatus) && order.getItems() != null) {
                order.getItems().forEach(item -> {
                    if (item.getBook() != null) {
                        bookRepository.incrementStock(item.getBook().getId(), item.getQuantity());
                        recordStockMovement(item.getBook(), StockMovement.MovementType.RETURN,
                                item.getQuantity(), 0, item.getQuantity(),
                                "Retour suite annulation commande #" + id, id, null);
                    }
                });
            }

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", id);
            response.put("status", newStatus);
            if (order.getTrackingNumber() != null) response.put("trackingNumber", order.getTrackingNumber());
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/orders/{id}/tracking")
    public ResponseEntity<?> setTrackingNumber(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return orderRepository.findById(id).map(order -> {
            String tracking = body.getOrDefault("trackingNumber", "").trim();
            if (tracking.isBlank()) {
                // Regenerate automatically
                tracking = generateChronopostNumber(order.getId());
            }
            order.setTrackingNumber(tracking);
            orderRepository.save(order);
            return ResponseEntity.ok(Map.of("orderId", id, "trackingNumber", tracking));
        }).orElse(ResponseEntity.notFound().build());
    }

    private String generateChronopostNumber(Long orderId) {
        // Chronopost format: CP + 9 digits + FR  (e.g. CP004200173FR)
        int random = ThreadLocalRandom.current().nextInt(10000, 99999);
        return String.format("CP%05d%05dFR", orderId, random);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION DES UTILISATEURS
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        users.forEach(u -> u.setPassword("***"));
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return userRepository.findById(id).map(user -> {
            String role = body.get("role").toUpperCase();
            if (!role.equals("ADMIN") && !role.equals("CLIENT"))
                return ResponseEntity.badRequest().body("Rôle invalide.");
            user.setRole(role);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("userId", id, "role", role));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MÉTHODE UTILITAIRE
    // ══════════════════════════════════════════════════════════════════════════

    private void recordStockMovement(Book book, StockMovement.MovementType type,
                                     int qty, int before, int after,
                                     String reason, Long orderId, String performedBy) {
        StockMovement mv = new StockMovement();
        mv.setBook(book);
        mv.setType(type);
        mv.setQuantity(qty);
        mv.setStockBefore(before);
        mv.setStockAfter(after);
        mv.setReason(reason);
        mv.setOrderId(orderId);
        mv.setPerformedBy(performedBy != null ? performedBy : "admin");
        stockMovementRepository.save(mv);
    }
}