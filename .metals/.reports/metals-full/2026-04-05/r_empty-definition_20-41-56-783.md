error id: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/OrderController.java:com/bookstore/model/Order#
file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/OrderController.java
empty definition using pc, found symbol in pc: com/bookstore/model/Order#
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 62
uri: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/OrderController.java
text:
```scala
package com.bookstore.Controller;

import com.bookstore.model.@@Order;
import com.bookstore.model.User;
import com.bookstore.repository.UserRepository;
import com.bookstore.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin("*")
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;

    public OrderController(OrderService orderService, UserRepository userRepository) {
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    // POST /api/orders  (CLIENT authentifié)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order createOrder(@RequestBody Order order, Authentication authentication) {
        User user = resolveAuthenticatedUser(authentication);
        order.setUser(user);
        return orderService.createOrder(order);
    }

    // GET /api/orders/my  (historique du client connecté)
    @GetMapping("/my")
    public List<Order> getMyOrders(Authentication authentication) {
        User user = resolveAuthenticatedUser(authentication);
        return orderService.getOrdersByUserId(user.getId());
    }

    private User resolveAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur non authentifié");
        }

        String principal = authentication.getName();
        return userRepository.findByUsername(principal)
                .or(() -> userRepository.findByEmail(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    // GET /api/orders/{id}
    @GetMapping("/{id}") // CORRIGÉ : Une seule @ ici
    public Order getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id);
    }

    // PATCH /api/orders/{id}/status  (ADMIN seulement)
    @PatchMapping("/{id}/status")
    public Order updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Statut manquant");
        }
        return orderService.updateStatus(id, newStatus);
    }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: com/bookstore/model/Order#