package com.bookstore.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import com.bookstore.model.Book;
import com.bookstore.model.Order;
import com.bookstore.repository.BookRepository;
import jakarta.mail.MessagingException;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.logging.Logger;
import org.springframework.context.annotation.Lazy;

@Service
public class EmailService {

    private static final Logger log = Logger.getLogger(EmailService.class.getName());

    private final BookRepository bookRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${BREVO_API_KEY:}")
    private String brevoApiKey;

    private static final String FROM_NAME  = "BookStore";
    private static final String FROM_EMAIL = "bookstoreiatpalt@gmail.com";

    public EmailService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    private void sendViaBrevo(String to, String subject, String htmlContent) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            log.warning("BREVO_API_KEY not set — email skipped");
            return;
        }
        String body = String.format(
            "{\"sender\":{\"name\":\"%s\",\"email\":\"%s\"},\"to\":[{\"email\":\"%s\"}],\"subject\":\"%s\",\"htmlContent\":%s}",
            FROM_NAME, FROM_EMAIL, to, subject, escapeJson(htmlContent)
        );
        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", brevoApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            restTemplate.exchange(
                "https://api.brevo.com/v3/smtp/email",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class
            );
            log.info("Email sent via Brevo to: " + to);
        } catch (Exception e) {
            log.warning("Brevo API error: " + e.getMessage());
        }
    }

    private String escapeJson(String html) {
        return "\"" + html.replace("\\", "\\\\").replace("\"", "\\\"")
                          .replace("\n", "\\n").replace("\r", "") + "\"";
    }

    // ── Confirmation de commande ──────────────────────────────────────────────

    public void sendOrderConfirmation(Order order) {
        if (order.getUser() == null || order.getUser().getEmail() == null) return;
        try {
            sendViaBrevo(
                order.getUser().getEmail().trim(),
                "BookStore – Confirmation de votre commande #" + order.getId(),
                buildOrderConfirmationBody(order)
            );
        } catch (Exception e) {
            // silencieux
        }
    }

    private String buildOrderConfirmationBody(Order order) {
        String dateStr = order.getOrderDate() != null
                ? order.getOrderDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm", Locale.FRANCE))
                : "";

        StringBuilder rows = new StringBuilder();
        if (order.getItems() != null) {
            for (var item : order.getItems()) {
                // Charger le livre depuis la BDD pour éviter le cache Hibernate
                String title    = "Livre";
                String imageUrl = "";
                if (item.getBook() != null && item.getBook().getId() != null) {
                    Optional<Book> fullBook = bookRepository.findById(item.getBook().getId());
                    title    = fullBook.map(Book::getTitle).filter(t -> t != null && !t.isBlank()).orElse("Livre");
                    imageUrl = fullBook.map(Book::getImageUrl).filter(u -> u != null && !u.isBlank()).orElse("");
                }
                double lineTotal = item.getPrice() * item.getQuantity();

                String imgTag = imageUrl.isBlank() ? "" : String.format(
                    "<img src=\"%s\" alt=\"\" width=\"44\" height=\"62\" " +
                    "style=\"object-fit:cover;border-radius:6px;display:block;\">",
                    escapeHtml(imageUrl)
                );

                rows.append(String.format("""
                    <tr>
                      <td style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.06);">
                        <div style="display:flex;align-items:center;gap:10px;">
                          %s
                          <span style="color:#f8fafc;font-size:13px;font-weight:600;">%s</span>
                        </div>
                      </td>
                      <td style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.06);color:#94a3b8;font-size:14px;text-align:center;">%d</td>
                      <td style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.06);color:#f59e0b;font-size:14px;text-align:right;white-space:nowrap;">%.2f €</td>
                    </tr>
                    """, imgTag, escapeHtml(title), item.getQuantity(), lineTotal));
            }
        }

        String username = order.getUser() != null ? order.getUser().getUsername() : "Client";
        String address  = order.getShippingAddress() != null ? escapeHtml(order.getShippingAddress()) : "—";

        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:40px 20px;">
                    <table width="520" cellpadding="0" cellspacing="0"
                           style="background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                      <!-- Header -->
                      <tr>
                        <td align="center" style="padding:32px 40px 24px;background:linear-gradient(135deg,#f59e0b,#ea580c);">
                          <h1 style="margin:0;color:#0f0f1a;font-size:22px;font-weight:bold;">BookStore</h1>
                          <p style="margin:8px 0 0;color:#0f0f1a;font-size:14px;opacity:0.8;">Confirmation de commande</p>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:32px 40px;">
                          <h2 style="margin:0 0 6px;color:#f8fafc;font-size:18px;">Merci pour votre commande, %s !</h2>
                          <p style="margin:0 0 24px;color:#94a3b8;font-size:13px;">Commande <strong style="color:#f59e0b;">#%d</strong> passée le %s</p>

                          <!-- Articles -->
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;margin-bottom:24px;">
                            <thead>
                              <tr style="background:rgba(255,255,255,0.05);">
                                <th style="padding:10px 8px;color:#64748b;font-size:12px;text-align:left;font-weight:600;">Article</th>
                                <th style="padding:10px 8px;color:#64748b;font-size:12px;text-align:center;font-weight:600;">Qté</th>
                                <th style="padding:10px 8px;color:#64748b;font-size:12px;text-align:right;font-weight:600;">Prix</th>
                              </tr>
                            </thead>
                            <tbody>
                              %s
                            </tbody>
                          </table>

                          <!-- Total -->
                          <div style="background:#0f0f1a;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;margin-bottom:24px;">
                            <span style="color:#94a3b8;font-size:15px;">Total</span>
                            <span style="color:#f59e0b;font-size:18px;font-weight:bold;">%.2f €</span>
                          </div>

                          <!-- Infos -->
                          <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                            <tr>
                              <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">Adresse de livraison</td>
                              <td style="padding:8px 0;color:#f8fafc;font-size:13px;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0;color:#64748b;font-size:13px;">Paiement</td>
                              <td style="padding:8px 0;color:#f8fafc;font-size:13px;">Paiement à la livraison (COD)</td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0;color:#64748b;font-size:13px;">Statut</td>
                              <td style="padding:8px 0;">
                                <span style="background:#f59e0b20;color:#f59e0b;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;">En préparation</span>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                            Vous recevrez une notification lors de l'expédition de votre colis.<br>
                            Pour toute question, contactez notre support.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.08);">
                          <p style="margin:0;color:#475569;font-size:11px;text-align:center;">
                            &copy; 2024 BookStore — Ce message est automatique, ne pas répondre.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(escapeHtml(username), order.getId(), dateStr, rows.toString(), order.getTotalAmount(), address);
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    // ── Mise à jour du statut de commande ────────────────────────────────────

    public void sendOrderStatusUpdate(Order order, String newStatus) {
        if (order.getUser() == null || order.getUser().getEmail() == null) return;
        String toEmail = order.getUser().getEmail().trim();

        try {
            sendViaBrevo(toEmail,
                "BookStore – Mise à jour de votre commande #" + order.getId(),
                buildStatusUpdateBody(order, newStatus));
        } catch (Exception e) {
            // silencieux
        }
    }

    private String buildStatusUpdateBody(Order order, String newStatus) {
        String statusLabel;
        String statusColor;
        String statusBg;
        String statusIcon;
        String statusMessage;

        switch (newStatus) {
            case "EN_PREPARATION" -> {
                statusLabel   = "En préparation";
                statusColor   = "#f59e0b";
                statusBg      = "#f59e0b20";
                statusIcon    = "&#9998;";
                statusMessage = "Votre commande est en cours de préparation. Nous vous tiendrons informé de la suite.";
            }
            case "EXPEDIEE" -> {
                statusLabel   = "Expédiée";
                statusColor   = "#3b82f6";
                statusBg      = "#3b82f620";
                statusIcon    = "&#128666;";
                statusMessage = "Votre commande a été expédiée et est en route vers vous !";
            }
            case "LIVREE" -> {
                statusLabel   = "Livrée";
                statusColor   = "#22c55e";
                statusBg      = "#22c55e20";
                statusIcon    = "&#10003;";
                statusMessage = "Votre commande a été livrée. Merci pour votre confiance !";
            }
            case "ANNULEE" -> {
                statusLabel   = "Annulée";
                statusColor   = "#ef4444";
                statusBg      = "#ef444420";
                statusIcon    = "&#10005;";
                statusMessage = "Votre commande a été annulée. Si vous avez des questions, contactez notre support.";
            }
            default -> {
                statusLabel   = newStatus;
                statusColor   = "#94a3b8";
                statusBg      = "#94a3b820";
                statusIcon    = "&#8226;";
                statusMessage = "Le statut de votre commande a été mis à jour.";
            }
        }

        String username = order.getUser() != null ? order.getUser().getUsername() : "Client";
        String dateStr  = order.getOrderDate() != null
                ? order.getOrderDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.FRANCE))
                : "";

        // Bloc suivi Chronopost — affiché uniquement si un numéro est disponible
        String trackingBlock = "";
        String trackingNumber = order.getTrackingNumber();
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            String trackingUrl = "https://www.chronopost.fr/tracking-no-redux/track?listeNumerosLT=" + trackingNumber;
            trackingBlock = String.format("""
                <!-- Tracking Chronopost -->
                <div style="background:#0f172a;border:1px solid #3b82f640;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">
                    &#128666;&nbsp; Suivi Chronopost
                  </p>
                  <p style="margin:0 0 4px;color:#f8fafc;font-size:13px;">Numéro de suivi :</p>
                  <p style="margin:0 0 14px;color:#3b82f6;font-size:18px;font-weight:800;letter-spacing:2px;font-family:monospace;">%s</p>
                  <a href="%s"
                     style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:13px;font-weight:700;
                            padding:10px 20px;border-radius:8px;text-decoration:none;">
                    Suivre mon colis &rarr;
                  </a>
                </div>
                """, escapeHtml(trackingNumber), trackingUrl);
        }

        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:40px 20px;">
                    <table width="520" cellpadding="0" cellspacing="0"
                           style="background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                      <!-- Header -->
                      <tr>
                        <td align="center" style="padding:32px 40px 24px;background:linear-gradient(135deg,#f59e0b,#ea580c);">
                          <h1 style="margin:0;color:#0f0f1a;font-size:22px;font-weight:bold;">BookStore</h1>
                          <p style="margin:8px 0 0;color:#0f0f1a;font-size:14px;opacity:0.8;">Mise à jour de commande</p>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:32px 40px;">
                          <h2 style="margin:0 0 6px;color:#f8fafc;font-size:18px;">Bonjour %s,</h2>
                          <p style="margin:0 0 28px;color:#94a3b8;font-size:13px;">
                            Le statut de votre commande <strong style="color:#f59e0b;">#%d</strong>
                            du %s a été mis à jour.
                          </p>

                          <!-- Status card -->
                          <div style="background:#0f0f1a;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;border:1px solid rgba(255,255,255,0.06);">
                            <div style="font-size:36px;margin-bottom:12px;">%s</div>
                            <span style="background:%s;color:%s;font-size:14px;font-weight:700;padding:6px 18px;border-radius:24px;">
                              %s
                            </span>
                            <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">%s</p>
                          </div>

                          %s

                          <!-- Total -->
                          <div style="background:#0f0f1a;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;margin-bottom:24px;border:1px solid rgba(255,255,255,0.06);">
                            <span style="color:#94a3b8;font-size:14px;">Total de la commande</span>
                            <span style="color:#f59e0b;font-size:16px;font-weight:bold;">%.2f €</span>
                          </div>

                          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                            Pour toute question concernant votre commande, contactez notre support.<br>
                            Ne répondez pas directement à cet email.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.08);">
                          <p style="margin:0;color:#475569;font-size:11px;text-align:center;">
                            &copy; 2024 BookStore — Ce message est automatique, ne pas répondre.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                escapeHtml(username),
                order.getId(),
                dateStr,
                statusIcon,
                statusBg, statusColor,
                statusLabel,
                statusMessage,
                trackingBlock,
                order.getTotalAmount()
            );
    }

    public void sendVerificationCode(String toEmail, String code, String type) throws MessagingException {
        String subject;
        String body;

        if ("signup".equals(type)) {
            subject = "BookStore – Code de vérification pour la création de compte";
            body = buildEmailBody(code, "Confirmer votre inscription",
                    "Vous avez demandé la création d'un compte sur BookStore.");
        } else if ("reset-password".equals(type)) {
            subject = "BookStore – Code de réinitialisation du mot de passe";
            body = buildEmailBody(code, "Réinitialiser votre mot de passe",
                    "Vous avez demandé la réinitialisation de votre mot de passe sur BookStore.");
        } else {
            subject = "BookStore – Code de connexion (2FA)";
            body = buildEmailBody(code, "Confirmer votre connexion",
                    "Une tentative de connexion a été détectée sur votre compte BookStore.");
        }

        sendViaBrevo(toEmail, subject, body);
    }

    private String buildEmailBody(String code, String title, String description) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:40px 20px;">
                        <table width="480" cellpadding="0" cellspacing="0"
                               style="background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
                          <!-- Header -->
                          <tr>
                            <td align="center" style="padding:32px 40px 24px;background:linear-gradient(135deg,#f59e0b,#ea580c);">
                              <h1 style="margin:0;color:#0f0f1a;font-size:24px;font-weight:bold;">
                                BookStore
                              </h1>
                            </td>
                          </tr>
                          <!-- Body -->
                          <tr>
                            <td style="padding:40px;">
                              <h2 style="margin:0 0 12px;color:#f8fafc;font-size:20px;">%s</h2>
                              <p style="margin:0 0 32px;color:#94a3b8;font-size:14px;line-height:1.6;">%s<br>
                                Votre code de vérification valable <strong style="color:#f59e0b;">15 minutes</strong> est :</p>
                              <!-- Code block -->
                              <div style="background:#0f0f1a;border:2px dashed #f59e0b;border-radius:12px;
                                          padding:24px;text-align:center;margin-bottom:32px;">
                                <span style="font-size:40px;font-weight:bold;letter-spacing:12px;
                                             color:#f59e0b;font-family:monospace;">%s</span>
                              </div>
                              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                                Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br>
                                Ne partagez jamais ce code avec quelqu'un.
                              </p>
                            </td>
                          </tr>
                          <!-- Footer -->
                          <tr>
                            <td style="padding:16px 40px;border-top:1px solid rgba(255,255,255,0.1);">
                              <p style="margin:0;color:#475569;font-size:11px;text-align:center;">
                                &copy; 2024 BookStore — Ce message est automatique, ne pas répondre.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(title, description, code);
    }
}