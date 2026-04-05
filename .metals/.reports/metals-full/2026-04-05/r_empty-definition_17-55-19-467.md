error id: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/BookController.java:_empty_/`<any>`#filter#
file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/BookController.java
empty definition using pc, found symbol in pc: _empty_/`<any>`#filter#
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 846
uri: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/BookController.java
text:
```scala
package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.repository.BookRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

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

    // GET /api/books/categories  — doit être avant /{id} pour éviter la collision
    @GetMapping("/categories")
    public List<String> getCategories() {
        return repository.findAll().stream()
                .map(Book::getCategory)
                .@@filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
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
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: _empty_/`<any>`#filter#