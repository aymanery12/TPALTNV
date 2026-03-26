package com.bookstore.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime orderDate;
    private String status;
    private double totalAmount;
    private String shippingAddress;
    private String paymentMethod;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "addresses", "role", "orders"}) // Ignorer "orders" chez le User pour éviter une autre boucle
    private User user;

    // FetchType.EAGER permet de charger les items directement pour le front-end
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items;

    // Indispensable pour Angular
    public String getUsername() {
        return (this.user != null) ? this.user.getUsername() : "Client";
    }
}