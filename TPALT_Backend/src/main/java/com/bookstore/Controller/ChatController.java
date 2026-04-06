package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.repository.BookRepository;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final GoogleAiGeminiChatModel gemini;
    private final BookRepository bookRepository;
    private String catalogueCache = null;

    public ChatController(GoogleAiGeminiChatModel gemini, BookRepository bookRepository) {
        this.gemini = gemini;
        this.bookRepository = bookRepository;
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
        catalogueCache = null;
        log.info("🔄 Cache catalogue vidé");
        return "OK";
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
        String lower = message.toLowerCase();
        boolean needsCatalogue = lower.contains("livre") || lower.contains("book")
                || lower.contains("recommande") || lower.contains("prix")
                || lower.contains("lire") || lower.contains("acheter")
                || lower.contains("auteur") || lower.contains("catalogue")
                || lower.contains("catégorie") || lower.contains("note");

        log.info("🔍 needsCatalogue={}", needsCatalogue);

        if (needsCatalogue) {
            if (catalogueCache == null) {
                log.info("📚 Chargement catalogue depuis BDD...");
                List<Book> books = bookRepository.findAll();
                log.info("📚 {} livres chargés", books.size());
                catalogueCache = books.stream()
                        .map(b -> String.format("- \"%s\" (catégorie: %s, prix: %.2f€, note: %.1f/5)",
                                b.getTitle(), b.getCategory(),
                                b.getPrice() != null ? b.getPrice() : 0.0,
                                b.getRating() != null ? b.getRating() : 0.0))
                        .collect(Collectors.joining("\n"));
            } else {
                log.info("📚 Catalogue depuis cache");
            }
            return """
                    Tu es un assistant libraire pour BookStore.
                    Catalogue : %s
                    Question : %s
                    Réponds en français, sois concis (2-3 phrases max).
                    """.formatted(catalogueCache, message);
        }

        return """
                Tu es un assistant sympathique pour BookStore.
                Réponds de façon courte et naturelle en français.
                Message : %s
                """.formatted(message);
    }
}