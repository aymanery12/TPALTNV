package com.bookstore.Controller;

import com.bookstore.model.Book;
import com.bookstore.model.Review;
import com.bookstore.model.User;
import com.bookstore.repository.BookRepository;
import com.bookstore.repository.ReviewRepository;
import com.bookstore.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/books/{bookId}/reviews")
@CrossOrigin("*")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    public ReviewController(ReviewRepository reviewRepository,
                            BookRepository bookRepository,
                            UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
    }

    // GET /api/books/{bookId}/reviews
    @GetMapping
    public List<Review> getReviews(@PathVariable Long bookId) {
        return reviewRepository.findByBookId(bookId);
    }

    // POST /api/books/{bookId}/reviews  (authentifié)
    // Body: { "rating": 4, "comment": "Très bon livre !" }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Review addReview(@PathVariable Long bookId,
                            @RequestBody Review review,
                            Authentication authentication) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Livre introuvable"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        review.setBook(book);
        review.setUser(user);
        return reviewRepository.save(review);
    }
}