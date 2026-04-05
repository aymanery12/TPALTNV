package com.bookstore.Controller;

import com.bookstore.repository.ReviewRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin("*")
public class ReviewStatsController {

    private final ReviewRepository reviewRepository;

    public ReviewStatsController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    // GET /api/reviews/average
    @GetMapping("/average")
    public double getAverageRating() {
        return reviewRepository.findAll().stream()
                .mapToInt(review -> review.getRating())
                .average()
                .orElse(0.0);
    }
}