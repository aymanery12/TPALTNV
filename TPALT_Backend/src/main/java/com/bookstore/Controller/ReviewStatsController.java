package com.bookstore.Controller;

import com.bookstore.repository.ReviewRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewStatsController {

    private final ReviewRepository reviewRepository;

    public ReviewStatsController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    // GET /api/reviews/average
    @GetMapping("/average")
    public double getAverageRating() {
        return reviewRepository.findAll().stream()
                .filter(review -> review.getRating() >= 1 && review.getRating() <= 5)
                .mapToInt(review -> review.getRating())
                .average()
                .orElse(0.0);
    }
}