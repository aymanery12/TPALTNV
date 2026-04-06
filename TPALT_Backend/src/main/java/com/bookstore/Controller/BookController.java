package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.repository.BookRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookRepository repository;

    public BookController(BookRepository repository) {
        this.repository = repository;
    }

    // GET /api/books
    @GetMapping
    public List<Book> getAllBooks() {
        return repository.findAll();
    }

    // GET /api/books/categories  — doit être avant /{id} pour éviter la collision
    @GetMapping("/categories")
    public List<String> getCategories() {
        return repository.findAll().stream()
            .map(Book::getCategory)
            .filter(c -> c != null && !c.isBlank())
            .collect(Collectors.toMap(
                String::toLowerCase,
                c -> c,
                (existing, replacement) -> existing
            ))
            .values()
            .stream()
            .sorted()
            .collect(Collectors.toList());
    }

    // GET /api/books/search?keyword=aventure
    @GetMapping("/search")
    public List<Book> searchBooks(@RequestParam String keyword) {
        return repository.searchByKeyword(keyword);
    }

    // GET /api/books/best-sellers?limit=5
    @GetMapping("/best-sellers")
    public List<BestSellerDto> getBestSellers(@RequestParam(defaultValue = "5") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));

        return repository.findBestSellersRealtime().stream()
                .limit(safeLimit)
                .map(row -> {
                    Long id = ((Number) row[0]).longValue();
                    String title = String.valueOf(row[1]);
                    int soldCount = ((Number) row[2]).intValue();
                    double price = row[3] == null ? 0.0 : ((Number) row[3]).doubleValue();
                    double discount = row[4] == null ? 0.0 : ((Number) row[4]).doubleValue();
                    double rating = row[5] == null ? 0.0 : ((Number) row[5]).doubleValue();
                    double finalPrice = discount > 0 ? price * (1 - discount / 100.0) : price;

                    return new BestSellerDto(
                            id,
                            title,
                            soldCount,
                            round2(price),
                            round2(finalPrice),
                            round1(rating)
                    );
                })
                .toList();
    }

    // GET /api/books/category/{category}
    @GetMapping("/category/{category}")
    public List<Book> getByCategory(@PathVariable String category) {
        return repository.findByCategory(category);
    }

    // GET /api/books/{id}
    @GetMapping("/{id}")
    public Book getBookById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Livre introuvable : " + id));
    }

    // POST /api/books  (ADMIN seulement - protégé dans SecurityConfig)
    @PostMapping
    public Book addBook(@RequestBody Book book) {
        return repository.save(book);
    }

    // DELETE /api/books/{id}  (ADMIN seulement)
    @DeleteMapping("/{id}")
    public void deleteBook(@PathVariable Long id) {
        repository.deleteById(id);
    }

    private static double round2(double value) {
        return Double.parseDouble(String.format(Locale.ROOT, "%.2f", value));
    }

    private static double round1(double value) {
        return Double.parseDouble(String.format(Locale.ROOT, "%.1f", value));
    }

    public record BestSellerDto(
            Long id,
            String title,
            Integer soldCount,
            Double price,
            Double finalPrice,
            Double rating
    ) {}
}