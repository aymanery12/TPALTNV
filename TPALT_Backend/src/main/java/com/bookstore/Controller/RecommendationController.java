package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.model.Order;
import com.bookstore.model.User;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.OrderRepository;
import com.bookstore.repository.UserRepository;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin("*")
public class RecommendationController {

    private static final Logger log = LoggerFactory.getLogger(RecommendationController.class);

    private final BookRepository     bookRepository;
    private final OrderRepository    orderRepository;
    private final UserRepository     userRepository;
    public RecommendationController(BookRepository bookRepository,
                                    OrderRepository orderRepository,
                                    UserRepository userRepository,
                                    GoogleAiGeminiChatModel gemini) {
        this.bookRepository  = bookRepository;
        this.orderRepository = orderRepository;
        this.userRepository  = userRepository;
    }

    /**
     * GET /api/recommendations
     * - Utilisateur connecté avec historique → recommandations IA personnalisées
     * - Nouvel utilisateur / non connecté → cold start (top livres)
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

        // ── Cold start : aucune commande ────────────────────────────────────
        if (orders.isEmpty()) {
            log.info("🔮 Cold start pour {} (aucune commande)", authentication.getName());
            return buildResponse(getColdStart(), "cold_start");
        }

        // ── Recommandations IA personnalisées ───────────────────────────────
        log.info("🤖 Recommandations IA pour {} ({} commandes)", authentication.getName(), orders.size());

        // Livres déjà achetés
        Set<Long> purchasedIds = orders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(item -> item.getBook() != null)
                .map(item -> item.getBook().getId())
                .collect(Collectors.toSet());

        List<Book> purchasedBooks = purchasedIds.stream()
                .map(id -> bookRepository.findById(id).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // Catalogue disponible (excluant les livres déjà achetés)
        List<Book> availableCatalog = bookRepository.findAll().stream()
                .filter(b -> !purchasedIds.contains(b.getId()))
                .collect(Collectors.toList());

        List<Book> aiRecs = getAIRecommendations(purchasedBooks, availableCatalog);
        if (aiRecs.isEmpty()) return buildResponse(getColdStart(), "cold_start");
        return buildResponse(aiRecs, "personalized");
        } catch (Exception e) {
            log.error("❌ Erreur Gemini recommandations : {}", e.getMessage());
    // ── Base de données : recommandations personnalisées ────────────────────
        }
    }
        if (catalog.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> purchasedIds = purchased.stream()
                .map(Book::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Integer> authorWeights = new HashMap<>();
        Map<String, Integer> categoryWeights = new HashMap<>();

        for (Book book : purchased) {
            int weight = Math.max(1, book.getSoldCount() != null ? book.getSoldCount() : 1);

            for (String rawAuthor : book.getAuthor() == null ? Collections.<String>emptyList() : book.getAuthor()) {
                String author = normalizeKey(rawAuthor);
                if (!author.isEmpty()) {
                    authorWeights.merge(author, weight, Integer::sum);
                }
            }

            String category = normalizeKey(book.getCategory());
            if (!category.isEmpty()) {
                categoryWeights.merge(category, weight, Integer::sum);
            }
        }

        List<BookScore> scored = catalog.stream()
                .filter(book -> !purchasedIds.contains(book.getId()))
                .map(book -> new BookScore(book, computeDatabaseScore(book, authorWeights, categoryWeights)))
                .sorted(Comparator
                        .comparingDouble(BookScore::score).reversed()
                        .thenComparing((BookScore bs) -> bs.book().getRating() != null ? bs.book().getRating() : 0.0, Comparator.reverseOrder())
                        .thenComparing((BookScore bs) -> bs.book().getSoldCount() != null ? bs.book().getSoldCount() : 0, Comparator.reverseOrder())
                        .thenComparing(bs -> bs.book().getTitle(), String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        List<Book> recommendations = scored.stream()
                .map(BookScore::book)
                .limit(10)
                .collect(Collectors.toList());

        if (recommendations.size() < 5) {
            Set<Long> selectedIds = recommendations.stream()
                    .map(Book::getId)
                    .collect(Collectors.toSet());

            for (Book book : catalog.stream()
                    .filter(book -> !selectedIds.contains(book.getId()))
                    .sorted(Comparator
                            .comparingDouble((Book b) -> b.getRating() != null ? b.getRating() : 0.0).reversed()
                            .thenComparing((Book b) -> b.getSoldCount() != null ? b.getSoldCount() : 0, Comparator.reverseOrder())
                            .thenComparing(Book::getTitle, String.CASE_INSENSITIVE_ORDER))
                    .collect(Collectors.toList())) {
                if (recommendations.size() >= 5) {
                    break;
                }
                recommendations.add(book);
                selectedIds.add(book.getId());
            }
        }

        return recommendations.size() > 10 ? recommendations.subList(0, 10) : recommendations;
        Map<String, Object> response = new LinkedHashMap<>();

    private double computeDatabaseScore(Book book,
                                        Map<String, Integer> authorWeights,
                                        Map<String, Integer> categoryWeights) {
        double score = 0.0;

        for (String rawAuthor : book.getAuthor() == null ? Collections.<String>emptyList() : book.getAuthor()) {
            String author = normalizeKey(rawAuthor);
            if (!author.isEmpty()) {
                score += authorWeights.getOrDefault(author, 0) * 5.0;
            }
        }

        String category = normalizeKey(book.getCategory());
        if (!category.isEmpty()) {
            score += categoryWeights.getOrDefault(category, 0) * 3.0;
        }

        double rating = book.getRating() != null ? book.getRating() : 0.0;
        int soldCount = book.getSoldCount() != null ? book.getSoldCount() : 0;
        boolean featured = Boolean.TRUE.equals(book.getFeatured());

        score += rating * 2.0;
        score += Math.min(soldCount, 500) / 50.0;
        if (featured) {
            score += 1.5;
        }

        return score;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record BookScore(Book book, double score) {}
        response.put("type", type);
        response.put("books", books);
        return response;
    }
}
