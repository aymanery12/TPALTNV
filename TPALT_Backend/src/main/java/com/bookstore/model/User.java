package com.bookstore.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @JsonIgnore // Sécurité : ne pas envoyer le mot de passe au client
    private String password;

    @Column(unique = true)
    private String email;

    private String role;

    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> addresses;
}