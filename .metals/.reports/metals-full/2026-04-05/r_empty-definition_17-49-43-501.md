error id: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/model/Book.java:_empty_/CollectionTable#
file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/model/Book.java
empty definition using pc, found symbol in pc: _empty_/CollectionTable#
semanticdb not found
empty definition using fallback
non-local guesses:

offset: 431
uri: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/model/Book.java
text:
```scala
package com.bookstore.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @ElementCollection(fetch = FetchType.EAGER)
    @@@CollectionTable(name = "book_author", joinColumns = @JoinColumn(name = "book_id"))
    @Column(name = "author")
    private List<String> author = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double price;

    private String imageUrl;

    private String category;

    // ISBN unique pour chaque livre
    @Column(unique = true)
    private String isbn;

    // Éditeur
    private String publisher;

    // Année de publication
    private Integer publishedYear;

    // Nombre de pages
    private Integer pages;

    // Langue
    private String language = "Français";

    // Note moyenne calculée
    private Double rating = 0.0;

    // Nombre de reviews
    private Integer reviewCount = 0;

    // ── GESTION DES STOCKS ────────────────────────────────────────────────────

    // Quantité actuelle en stock
    @Column(nullable = false)
    private Integer quantity = 0;

    // Seuil d'alerte stock critique
    private Integer stockAlert = 5;

    // Quantité vendue au total (pour les stats)
    private Integer soldCount = 0;

    // Statut du livre
    @Enumerated(EnumType.STRING)
    private BookStatus status = BookStatus.ACTIVE;

    // Mise en avant (featured / bestseller)
    private Boolean featured = false;

    // Remise en pourcentage (0 = pas de remise)
    private Double discount = 0.0;

    // Date d'ajout au catalogue
    private LocalDateTime createdAt;

    // Date de dernière modification
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum BookStatus {
        ACTIVE,       // En vente
        OUT_OF_STOCK, // Rupture de stock
        DISCONTINUED, // Plus vendu
        COMING_SOON   // À paraître
    }

    // Prix après remise
    public Double getFinalPrice() {
        if (discount != null && discount > 0) {
            return price * (1 - discount / 100.0);
        }
        return price;
    }

    // Le livre est-il en stock critique ?
    public boolean isLowStock() {
        return quantity != null && stockAlert != null && quantity <= stockAlert;
    }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: _empty_/CollectionTable#