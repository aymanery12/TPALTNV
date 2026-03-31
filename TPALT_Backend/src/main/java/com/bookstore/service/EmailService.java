package com.bookstore.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationCode(String toEmail, String code, String type) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);

        String subject;
        String body;

        if ("signup".equals(type)) {
            subject = "BookStore – Code de vérification pour la création de compte";
            body = buildEmailBody(code, "Confirmer votre inscription",
                    "Vous avez demandé la création d'un compte sur BookStore.");
        } else {
            subject = "BookStore – Code de connexion (2FA)";
            body = buildEmailBody(code, "Confirmer votre connexion",
                    "Une tentative de connexion a été détectée sur votre compte BookStore.");
        }

        helper.setSubject(subject);
        helper.setText(body, true);
        mailSender.send(message);
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
                                📚 BookStore
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