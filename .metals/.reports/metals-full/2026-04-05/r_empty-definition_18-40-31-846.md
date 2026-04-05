error id: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/AuthController.java:_empty_/UserRepository#findByUsernameNormalized#
file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/AuthController.java
empty definition using pc, found symbol in pc: _empty_/UserRepository#findByUsernameNormalized#
empty definition using semanticdb
empty definition using fallback
non-local guesses:

offset: 4390
uri: file://<WORKSPACE>/TPALT_Backend/src/main/java/com/bookstore/Controller/AuthController.java
text:
```scala
package com.bookstore.Controller;

import com.bookstore.model.User;
import com.bookstore.model.VerificationCode;
import com.bookstore.repository.UserRepository;
import com.bookstore.repository.VerificationCodeRepository;
import com.bookstore.security.JwtUtil;
import com.bookstore.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

// ─── DTOs ────────────────────────────────────────────────────────────────────

class LoginRequest {
    private String username;
    private String password;
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

class SignupRequest {
    private String username;
    private String email;
    private String password;
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

class SendCodeRequest {
    private String email;
    private String username; // utilisé pour signup uniquement (vérification unicité)
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}

class VerifySignupRequest {
    private String username;
    private String email;
    private String password;
    private String code;
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

class VerifyLoginRequest {
    private String username;
    private String code;
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

// ─── Controller ──────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    private final SecureRandom random = new SecureRandom();

    public AuthController(UserRepository userRepository,
                          VerificationCodeRepository verificationCodeRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          EmailService emailService) {
        this.userRepository             = userRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.passwordEncoder            = passwordEncoder;
        this.jwtUtil                    = jwtUtil;
        this.emailService               = emailService;
    }

    // ── 1. Envoi du code pour l'inscription ──────────────────────────────────

    @PostMapping("/send-code/signup")
    public ResponseEntity<?> sendSignupCode(@RequestBody SendCodeRequest req) {
        String email = normalizeEmail(req.getEmail());
        String username = normalizeUsername(req.getUsername());

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email requis."));
        }
        if (username != null && !username.isBlank() && userRepository.@@findByUsernameNormalized(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Nom d'utilisateur déjà pris."));
        }
        if (userRepository.findByEmailNormalized(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email déjà utilisé."));
        }

        String code = generateCode();
        saveCode(email, null, code, "signup");

        try {
            emailService.sendVerificationCode(email, code, "signup");
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Échec d'envoi de l'email : " + e.getMessage()));
        }

        return ResponseEntity.ok(Map.of("message", "Code envoyé à " + maskEmail(email)));
    }

    // ── 2. Vérification du code + création du compte ─────────────────────────

    @PostMapping("/verify-signup")
    public ResponseEntity<?> verifySignup(@RequestBody VerifySignupRequest req) {
        String username = normalizeUsername(req.getUsername());
        String email = normalizeEmail(req.getEmail());

        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nom d'utilisateur requis."));
        }
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email requis."));
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mot de passe requis."));
        }
        if (userRepository.findByUsernameNormalized(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Nom d'utilisateur déjà pris."));
        }
        if (userRepository.findByEmailNormalized(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email déjà utilisé."));
        }

        ResponseEntity<?> codeCheck = validateCode(email, req.getCode(), "signup");
        if (codeCheck != null) return codeCheck;

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole("CLIENT");
        userRepository.save(user);

        markCodeUsed(email, "signup");

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        return ResponseEntity.ok(Map.of(
                "message",  "Compte créé avec succès.",
                "token",    token,
                "username", user.getUsername(),
                "role",     user.getRole()
        ));
    }

    // ── 3. Connexion : vérification des identifiants + retour JWT ────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String identifier = req.getUsername() == null ? null : req.getUsername().trim();

        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identifiant manquant."));
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mot de passe manquant."));
        }

        Optional<User> optUser = userRepository.findByUsernameNormalized(identifier)
                .or(() -> userRepository.findByEmailNormalized(identifier));
        if (optUser.isEmpty() || !passwordEncoder.matches(req.getPassword(), optUser.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects."));
        }

        User user = optUser.get();
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        return ResponseEntity.ok(Map.of(
                "token",    token,
                "username", user.getUsername(),
                "role",     user.getRole()
        ));
    }

    private String normalizeUsername(String username) {
        if (username == null) return null;
        return username.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null) return null;
        return email.trim().toLowerCase();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String generateCode() {
        int n = 100000 + random.nextInt(900000);
        return String.valueOf(n);
    }

    private void saveCode(String email, String username, String code, String type) {
        VerificationCode vc = new VerificationCode();
        vc.setEmail(email);
        vc.setUsername(username);
        vc.setCode(code);
        vc.setType(type);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        verificationCodeRepository.save(vc);
    }

    private ResponseEntity<?> validateCode(String email, String code, String type) {
        Optional<VerificationCode> optCode = verificationCodeRepository
                .findTopByEmailAndTypeAndUsedFalseOrderByExpiresAtDesc(email, type);

        if (optCode.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Aucun code actif trouvé. Renvoyez un code."));
        }
        VerificationCode vc = optCode.get();
        if (LocalDateTime.now().isAfter(vc.getExpiresAt())) {
            return ResponseEntity.status(400).body(Map.of("error", "Code expiré. Renvoyez un code."));
        }
        if (!vc.getCode().equals(code)) {
            return ResponseEntity.status(400).body(Map.of("error", "Code incorrect."));
        }
        return null; // OK
    }

    private void markCodeUsed(String email, String type) {
        verificationCodeRepository
                .findTopByEmailAndTypeAndUsedFalseOrderByExpiresAtDesc(email, type)
                .ifPresent(vc -> {
                    vc.setUsed(true);
                    verificationCodeRepository.save(vc);
                });
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String local = parts[0];
        String domain = parts[1];
        if (local.length() <= 2) return "**@" + domain;
        return local.charAt(0) + "*".repeat(local.length() - 2) + local.charAt(local.length() - 1) + "@" + domain;
    }
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: _empty_/UserRepository#findByUsernameNormalized#