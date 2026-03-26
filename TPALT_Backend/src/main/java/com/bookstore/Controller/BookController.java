package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.repository.BookRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@CrossOrigin("*")
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

    // GET /api/books/{id}
    @GetMapping("/{id}")
    public Book getBookById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Livre introuvable : " + id));
    }

    // GET /api/books/search?keyword=aventure
    @GetMapping("/search")
    public List<Book> searchBooks(@RequestParam String keyword) {
        return repository.searchByKeyword(keyword);
    }

    // GET /api/books/category/{category}
    @GetMapping("/category/{category}")
    public List<Book> getByCategory(@PathVariable String category) {
        return repository.findByCategory(category);
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
}