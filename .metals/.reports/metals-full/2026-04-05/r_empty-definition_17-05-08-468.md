error id: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/ReviewController.java:_empty_/`<any>`#average#
file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/ReviewController.java
empty definition using pc, found symbol in pc: _empty_/`<any>`#average#
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 2319
uri: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/ReviewController.java
text:
```scala
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
        Review saved = reviewRepository.save(review);

        // Recalculer la note moyenne et le nombre d'avis du livre
        List<Review> allReviews = reviewRepository.findByBookId(bookId);
        double avg = allReviews.stream().mapToInt(Review::getRating).@@average().orElse(0.0);
        book.setRating(Math.round(avg * 10.0) / 10.0);
        book.setReviewCount(allReviews.size());
        bookRepository.save(book);

        return saved;
    }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: _empty_/`<any>`#average#