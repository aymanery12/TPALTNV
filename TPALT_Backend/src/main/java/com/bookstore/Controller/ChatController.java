package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.model.Order;
import com.bookstore.model.OrderItem;
import com.bookstore.model.User;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.OrderRepository;
import com.bookstore.repository.UserRepository;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final GoogleAiGeminiChatModel gemini;
    private final BookRepository bookRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public ChatController(
            GoogleAiGeminiChatModel gemini,
            BookRepository bookRepository,
            OrderRepository orderRepository,
            UserRepository userRepository
    ) {
        this.gemini = gemini;
        this.bookRepository = bookRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        log.info("✅ ChatController initialisé avec succès");
    }

    @GetMapping("/ask")
    public String askAi(@RequestParam String message) {
        log.info("📩 Message reçu : '{}'", message);

        String prompt = buildPrompt(message);
        log.info("📝 Prompt construit ({} caractères)", prompt.length());

        try {
            log.info("⏳ Envoi à Gemini...");
            long start = System.currentTimeMillis();

            String response = gemini.generate(prompt);

            long duration = System.currentTimeMillis() - start;
            log.info("✅ Réponse Gemini reçue en {}ms : '{}'", duration, response);

            return response;

        } catch (Exception e) {
            log.error("❌ Erreur Gemini : {}", e.getMessage(), e);
            return "Désolé, une erreur s'est produite : " + e.getMessage();
        }
    }

    @PostMapping("/refresh-catalogue")
    public String refreshCatalogue() {
        log.info("ℹ️ refresh-catalogue appelé: le contexte est désormais généré en temps réel, pas de cache à vider.");
        return "OK (real-time context enabled)";
    }

    @GetMapping("/summary/{bookId}")
    public String summarizeBook(@PathVariable Long bookId) {
        log.info("📖 Résumé demandé pour bookId={}", bookId);
        try {
            Book book = bookRepository.findById(bookId)
                    .orElseThrow(() -> new RuntimeException("Introuvable : " + bookId));
            log.info("📖 Livre trouvé : '{}'", book.getTitle());
            String result = gemini.generate("""
                    Fais un résumé attrayant en 3 phrases max.
                    Titre : %s | Description : %s | Catégorie : %s
                    """.formatted(book.getTitle(), book.getDescription(), book.getCategory()));
            log.info("✅ Résumé généré");
            return result;
        } catch (Exception e) {
            log.error("❌ Erreur summary bookId={} : {}", bookId, e.getMessage());
            throw e;
        }
    }

    private String buildPrompt(String message) {
        List<Book> books = bookRepository.findAll();
        List<Book> relevantBooks = selectRelevantBooks(message, books);
        String bookContext = formatBookContext(relevantBooks);
        String userOrderContext = buildUserOrderContext();

        log.info("📚 Contexte DB: totalBooks={}, relevantBooks={}", books.size(), relevantBooks.size());

        return """
                Tu es un assistant libraire BookStore.
                IMPORTANT:
                - Utilise STRICTEMENT les données ci-dessous (base de données en temps réel).
                - N'invente jamais de titre, de note, de prix, de statut ou de commande.
                - Si l'information n'existe pas dans les données, dis-le clairement.
                - Réponds en français, de façon concise et utile.

                Données catalogue pertinentes:
                %s

                Données utilisateur connecté:
                %s

                Question utilisateur:
                %s
                """.formatted(bookContext, userOrderContext, message);
    }

    private List<Book> selectRelevantBooks(String message, List<Book> books) {
        String normalized = normalize(message);

        if (containsAny(normalized, "mieux notes", "top notes", "top 5", "rating")) {
            return books.stream()
                    .sorted(Comparator
                            .comparing((Book b) -> safeDouble(b.getRating())).reversed()
                            .thenComparing((Book b) -> safeInt(b.getReviewCount()), Comparator.reverseOrder())
                            .thenComparing((Book b) -> safeInt(b.getSoldCount()), Comparator.reverseOrder()))
                    .limit(15)
                    .toList();
        }

        if (containsAny(normalized, "offre", "promo", "promotion")) {
            return books.stream()
                    .filter(b -> safeDouble(b.getDiscount()) > 0)
                    .sorted(Comparator.comparing((Book b) -> safeDouble(b.getDiscount())).reversed())
                    .limit(20)
                    .toList();
        }

        if (containsAny(normalized, "plus vendus", "meilleures ventes", "best seller", "best-seller")) {
            Map<Long, Book> booksById = books.stream()
                .collect(Collectors.toMap(Book::getId, b -> b, (existing, replacement) -> existing));

            List<Book> realtimeBestSellers = bookRepository.findBestSellersRealtime().stream()
                .map(row -> booksById.get(((Number) row[0]).longValue()))
                .filter(b -> b != null)
                .limit(20)
                .toList();

            if (!realtimeBestSellers.isEmpty()) {
            return realtimeBestSellers;
            }

            return books.stream()
                .filter(b -> safeInt(b.getSoldCount()) > 0)
                .sorted(Comparator.comparing((Book b) -> safeInt(b.getSoldCount())).reversed())
                .limit(20)
                .toList();
        }

        if (containsAny(normalized, "moins de 20", "pas cher", "petit budget", "< 20")) {
            return books.stream()
                    .filter(b -> finalPrice(b) <= 20)
                    .sorted(Comparator.comparing(this::finalPrice))
                    .limit(20)
                    .toList();
        }

        Set<String> tokens = Arrays.stream(normalized.split("\\s+"))
                .map(String::trim)
                .filter(t -> t.length() >= 3)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (!tokens.isEmpty()) {
            Predicate<Book> matcher = b -> {
                String haystack = normalize(String.join(" ",
                        b.getTitle() == null ? "" : b.getTitle(),
                        b.getCategory() == null ? "" : b.getCategory(),
                        b.getAuthor() == null ? "" : String.join(" ", b.getAuthor())
                ));
                return tokens.stream().anyMatch(haystack::contains);
            };

            List<Book> matched = books.stream()
                    .filter(matcher)
                    .sorted(Comparator
                            .comparing((Book b) -> safeDouble(b.getRating())).reversed()
                            .thenComparing((Book b) -> safeInt(b.getReviewCount()), Comparator.reverseOrder()))
                    .limit(20)
                    .toList();

            if (!matched.isEmpty()) {
                return matched;
            }
        }

        return books.stream()
                .sorted(Comparator
                        .comparing((Book b) -> safeDouble(b.getRating())).reversed()
                        .thenComparing((Book b) -> safeInt(b.getReviewCount()), Comparator.reverseOrder()))
                .limit(20)
                .toList();
    }

    private String formatBookContext(List<Book> books) {
        if (books.isEmpty()) {
            return "- Aucun livre pertinent trouvé.";
        }

        return books.stream()
                .map(b -> String.format(Locale.ROOT,
                        "- id=%d | titre=\"%s\" | categorie=%s | prix=%.2fEUR | prixFinal=%.2fEUR | note=%.1f/5 | reviews=%d | ventes=%d | remise=%.0f%%",
                        b.getId(),
                        safeString(b.getTitle()),
                        safeString(b.getCategory()),
                        safeDouble(b.getPrice()),
                        finalPrice(b),
                        safeDouble(b.getRating()),
                        safeInt(b.getReviewCount()),
                        safeInt(b.getSoldCount()),
                        safeDouble(b.getDiscount())))
                .collect(Collectors.joining("\n"));
    }

    private String buildUserOrderContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return "- Utilisateur non authentifié.";
        }

        String username = auth.getName();
        User user = userRepository.findByUsernameNormalized(username).orElse(null);
        if (user == null) {
            return "- Utilisateur authentifié mais introuvable en base.";
        }

        List<Order> orders = orderRepository.findByUserId(user.getId());
        if (orders.isEmpty()) {
            return "- Aucune commande utilisateur.";
        }

        Map<String, Long> statusCounts = orders.stream()
                .collect(Collectors.groupingBy(o -> safeString(o.getStatus()), Collectors.counting()));

        List<String> recentItems = new ArrayList<>();
        for (Order order : orders.stream()
                .sorted(Comparator.comparing(Order::getOrderDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .toList()) {
            for (OrderItem item : order.getItems()) {
                if (item.getBook() != null && item.getBook().getTitle() != null) {
                    recentItems.add(item.getBook().getTitle());
                }
            }
        }

        String items = recentItems.stream().distinct().limit(12).collect(Collectors.joining(", "));
        if (items.isBlank()) {
            items = "Aucun";
        }

        return String.format(Locale.ROOT,
                "- username=%s\n- commandesTotal=%d\n- commandesParStatut=%s\n- livresRecemmentCommandes=%s",
                username,
                orders.size(),
                statusCounts,
                items);
    }

    private boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) return true;
        }
        return false;
    }

    private String normalize(String text) {
        return (text == null ? "" : text)
                .toLowerCase(Locale.ROOT)
                .replace('é', 'e')
                .replace('è', 'e')
                .replace('ê', 'e')
                .replace('ë', 'e')
                .replace('à', 'a')
                .replace('â', 'a')
                .replace('î', 'i')
                .replace('ï', 'i')
                .replace('ô', 'o')
                .replace('ö', 'o')
                .replace('ù', 'u')
                .replace('û', 'u')
                .replace('ü', 'u')
                .replace('ç', 'c');
    }

    private double finalPrice(Book b) {
        double price = safeDouble(b.getPrice());
        double discount = safeDouble(b.getDiscount());
        return discount > 0 ? price * (1 - discount / 100.0) : price;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String safeString(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}