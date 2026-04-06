package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.model.Order;
import com.bookstore.model.User;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.OrderRepository;
import com.bookstore.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private static final Logger log = LoggerFactory.getLogger(RecommendationController.class);

    private final BookRepository  bookRepository;
    private final OrderRepository orderRepository;
    private final UserRepository  userRepository;

    public RecommendationController(BookRepository bookRepository,
                                    OrderRepository orderRepository,
                                    UserRepository userRepository) {
        this.bookRepository  = bookRepository;
        this.orderRepository = orderRepository;
        this.userRepository  = userRepository;
    }

    /**
     * GET /api/recommendations
     * - Utilisateur connecté avec historique → recommandations personnalisées (scoring)
     * - Nouvel utilisateur / non connecté    → cold start (top livres)
     */
    @GetMapping
    public Map<String, Object> getRecommendations(Authentication authentication) {

        // ── Cold start : utilisateur non connecté ────────────────────────────
        if (authentication == null || !authentication.isAuthenticated()) {
            log.info("🔮 Recommandations cold start (non connecté)");
            return buildResponse(getColdStart(), "cold_start");
        }

        Optional<User> optUser = userRepository.findByUsername(authentication.getName());
        if (optUser.isEmpty()) {
            return buildResponse(getColdStart(), "cold_start");
        }

        List<Order> orders = orderRepository.findByUserId(optUser.get().getId());

        // ── Cold start : aucune commande ─────────────────────────────────────
        if (orders.isEmpty()) {
            log.info("🔮 Cold start pour {} (aucune commande)", authentication.getName());
            return buildResponse(getColdStart(), "cold_start");
        }

        // ── Recommandations personnalisées ────────────────────────────────────
        log.info("🤖 Recommandations personnalisées pour {} ({} commandes)",
                authentication.getName(), orders.size());
        try {
            Set<Long> purchasedIds = orders.stream()
                    .flatMap(o -> o.getItems().stream())
                    .filter(item -> item.getBook() != null)
                    .map(item -> item.getBook().getId())
                    .collect(Collectors.toSet());

            List<Book> purchasedBooks = purchasedIds.stream()
                    .map(id -> bookRepository.findById(id).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            List<Book> availableCatalog = bookRepository.findAll().stream()
                    .filter(b -> !purchasedIds.contains(b.getId()))
                    .collect(Collectors.toList());

            List<Book> recs = getPersonalizedRecommendations(purchasedBooks, availableCatalog);
            if (recs.isEmpty()) return buildResponse(getColdStart(), "cold_start");
            return buildResponse(recs, "personalized");

        } catch (Exception e) {
            log.error("❌ Erreur recommandations : {}", e.getMessage());
            return buildResponse(getColdStart(), "cold_start");
        }
    }

    // ── Scoring personnalisé (auteurs + catégories achetés) ───────────────────

    private List<Book> getPersonalizedRecommendations(List<Book> purchased, List<Book> catalog) {
        if (catalog.isEmpty()) return Collections.emptyList();

        Set<Long> purchasedIds = purchased.stream()
                .map(Book::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Integer> authorWeights   = new HashMap<>();
        Map<String, Integer> categoryWeights = new HashMap<>();

        for (Book book : purchased) {
            int weight = Math.max(1, book.getSoldCount() != null ? book.getSoldCount() : 1);
            for (String raw : book.getAuthor() == null ? Collections.<String>emptyList() : book.getAuthor()) {
                String author = normalizeKey(raw);
                if (!author.isEmpty()) authorWeights.merge(author, weight, Integer::sum);
            }
            String category = normalizeKey(book.getCategory());
            if (!category.isEmpty()) categoryWeights.merge(category, weight, Integer::sum);
        }

        List<Book> recommendations = catalog.stream()
                .filter(b -> !purchasedIds.contains(b.getId()))
                .sorted(Comparator
                        .comparingDouble((Book b) -> computeScore(b, authorWeights, categoryWeights)).reversed()
                        .thenComparing((Book b) -> b.getRating()   != null ? b.getRating()   : 0.0, Comparator.reverseOrder())
                        .thenComparing((Book b) -> b.getSoldCount() != null ? b.getSoldCount() : 0,  Comparator.reverseOrder()))
                .limit(10)
                .collect(Collectors.toList());

        // Compléter jusqu'à 5 résultats si scoring insuffisant
        if (recommendations.size() < 5) {
            Set<Long> selectedIds = recommendations.stream().map(Book::getId).collect(Collectors.toSet());
            catalog.stream()
                    .filter(b -> !selectedIds.contains(b.getId()) && !purchasedIds.contains(b.getId()))
                    .sorted(Comparator.comparingDouble((Book b) -> b.getRating() != null ? b.getRating() : 0.0).reversed())
                    .limit(5 - recommendations.size())
                    .forEach(recommendations::add);
        }

        return recommendations;
    }

    // ── Cold start : top livres par note + ventes ─────────────────────────────

    private List<Book> getColdStart() {
        return bookRepository.findAll().stream()
                .filter(b -> b.getStatus() == null || "ACTIVE".equals(b.getStatus().name()))
                .sorted(Comparator
                        .comparingDouble((Book b) -> b.getRating()   != null ? b.getRating()   : 0.0).reversed()
                        .thenComparing((Book b)   -> b.getSoldCount() != null ? b.getSoldCount() : 0,  Comparator.reverseOrder()))
                .limit(10)
                .collect(Collectors.toList());
    }

    // ── Calcul du score ───────────────────────────────────────────────────────

    private double computeScore(Book book,
                                Map<String, Integer> authorWeights,
                                Map<String, Integer> categoryWeights) {
        double score = 0.0;
        for (String raw : book.getAuthor() == null ? Collections.<String>emptyList() : book.getAuthor()) {
            score += authorWeights.getOrDefault(normalizeKey(raw), 0) * 5.0;
        }
        score += categoryWeights.getOrDefault(normalizeKey(book.getCategory()), 0) * 3.0;
        score += (book.getRating()   != null ? book.getRating()   : 0.0) * 2.0;
        score += Math.min(book.getSoldCount() != null ? book.getSoldCount() : 0, 500) / 50.0;
        if (Boolean.TRUE.equals(book.getFeatured())) score += 1.5;
        return score;
    }

    private Map<String, Object> buildResponse(List<Book> books, String type) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("type",  type);
        response.put("books", books);
        return response;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
