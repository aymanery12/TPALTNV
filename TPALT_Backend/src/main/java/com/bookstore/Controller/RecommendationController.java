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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin("*")
public class RecommendationController {

    private static final Logger log = LoggerFactory.getLogger(RecommendationController.class);

    private final BookRepository     bookRepository;
    private final OrderRepository    orderRepository;
    private final UserRepository     userRepository;
    private final GoogleAiGeminiChatModel gemini;

    public RecommendationController(BookRepository bookRepository,
                                    OrderRepository orderRepository,
                                    UserRepository userRepository,
                                    GoogleAiGeminiChatModel gemini) {
        this.bookRepository  = bookRepository;
        this.orderRepository = orderRepository;
        this.userRepository  = userRepository;
        this.gemini          = gemini;
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

        if (availableCatalog.isEmpty()) {
            return buildResponse(getColdStart(), "cold_start");
        }

        try {
            List<Book> aiRecs = getAIRecommendations(purchasedBooks, availableCatalog);
            if (aiRecs.isEmpty()) return buildResponse(getColdStart(), "cold_start");
            return buildResponse(aiRecs, "personalized");
        } catch (Exception e) {
            log.error("❌ Erreur Gemini recommandations : {}", e.getMessage());
            return buildResponse(getColdStart(), "cold_start");
        }
    }

    // ── Gemini : génère les recommandations ──────────────────────────────────

    private List<Book> getAIRecommendations(List<Book> purchased, List<Book> catalog) {
        // Résumé des achats
        String purchasedStr = purchased.stream()
                .map(b -> String.format("\"%s\" (catégorie: %s)", b.getTitle(), b.getCategory()))
                .collect(Collectors.joining(", "));

        // Catalogue limité à 60 livres pour éviter un prompt trop long
        List<Book> limitedCatalog = catalog.size() > 60
                ? catalog.stream()
                        .sorted(Comparator.comparingDouble((Book b) -> b.getRating() != null ? b.getRating() : 0.0).reversed())
                        .limit(60)
                        .collect(Collectors.toList())
                : catalog;

        String catalogStr = limitedCatalog.stream()
                .map(b -> String.format("%d|%s|%s|%.1f",
                        b.getId(), b.getTitle(), b.getCategory(),
                        b.getRating() != null ? b.getRating() : 0.0))
                .collect(Collectors.joining("\n"));

        String prompt = """
                Tu es un moteur de recommandation de livres pour une librairie en ligne.

                Livres déjà achetés par l'utilisateur :
                %s

                Catalogue disponible (format: ID|Titre|Catégorie|Note) :
                %s

                En te basant sur les goûts de l'utilisateur (catégories, thèmes similaires),
                recommande exactement 6 livres qu'il n'a pas encore achetés.
                Réponds UNIQUEMENT avec un tableau JSON d'IDs entiers, exemple : [3, 7, 12, 4, 8, 15]
                Aucun texte avant ou après. Juste le tableau JSON.
                """.formatted(purchasedStr, catalogStr);

        log.info("📝 Prompt recommandations envoyé à Gemini ({} chars)", prompt.length());
        String response = gemini.generate(prompt);
        log.info("✅ Réponse Gemini : {}", response);

        // Extraire les IDs depuis la réponse (regex robuste)
        Pattern pattern = Pattern.compile("\\d+");
        Matcher matcher = pattern.matcher(response);
        List<Long> ids = new ArrayList<>();
        while (matcher.find() && ids.size() < 6) {
            ids.add(Long.parseLong(matcher.group()));
        }

        return ids.stream()
                .map(id -> bookRepository.findById(id).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // ── Cold start : top livres par note et featured ─────────────────────────

    private List<Book> getColdStart() {
        return bookRepository.findAll().stream()
                .sorted(Comparator
                        .comparingDouble((Book b) -> {
                            double rating = b.getRating() != null ? b.getRating() : 0.0;
                            boolean featured = Boolean.TRUE.equals(b.getFeatured());
                            return rating + (featured ? 1.0 : 0.0); // featured books boosted
                        }).reversed())
                .limit(8)
                .collect(Collectors.toList());
    }

    // ── Helper réponse ────────────────────────────────────────────────────────

    private Map<String, Object> buildResponse(List<Book> books, String type) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("type", type);
        response.put("books", books);
        return response;
    }
}
