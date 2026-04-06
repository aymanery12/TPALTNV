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

        if (review.getRating() < 1 || review.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La note doit etre comprise entre 1 et 5");
        }

        review.setBook(book);
        review.setUser(user);
        Review saved = reviewRepository.save(review);

        // Recalculer la note moyenne et le nombre d'avis du livre
        List<Review> allReviews = reviewRepository.findByBookId(bookId);
        List<Review> validReviews = allReviews.stream()
            .filter(r -> r.getRating() >= 1 && r.getRating() <= 5)
            .toList();

        double avg = validReviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        book.setRating(Math.round(avg * 10.0) / 10.0);
        book.setReviewCount(validReviews.size());
        bookRepository.save(book);

        return saved;
    }
}