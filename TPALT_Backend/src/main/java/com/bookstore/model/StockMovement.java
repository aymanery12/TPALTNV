package com.bookstore.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Enregistre chaque mouvement de stock (entrée, sortie, correction, retour).
 * Permet l'historique complet et l'audit des stocks.
 */
@Entity
@Table(name = "stock_movements")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "book_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "author", "description",
            "publisher", "isbn", "pages", "language", "createdAt", "updatedAt",
            "reviewCount", "soldCount", "featured", "discount", "finalPrice",
            "stockAlert", "status"})
    private Book book;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType type;

    // Quantité ajoutée (positive) ou retirée (négative)
    @Column(nullable = false)
    private Integer quantity;

    // Stock avant le mouvement
    private Integer stockBefore;

    // Stock après le mouvement
    private Integer stockAfter;

    // Raison / note de l'admin
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Admin qui a effectué le mouvement
    private String performedBy;

    // Commande associée (si mouvement dû à une vente)
    private Long orderId;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }

    public enum MovementType {
        RESTOCK,     // Réapprovisionnement
        SALE,        // Vente (décrément automatique)
        RETURN,      // Retour client
        CORRECTION,  // Correction manuelle par admin
        LOSS,        // Perte / casse
        INITIAL      // Stock initial à la création du livre
    }
}