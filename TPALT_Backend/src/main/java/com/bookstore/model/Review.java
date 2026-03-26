package com.bookstore.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int rating; // 1 à 5
    private String comment;

    @ManyToOne
    private Book book;

    @ManyToOne
    private User user;
}