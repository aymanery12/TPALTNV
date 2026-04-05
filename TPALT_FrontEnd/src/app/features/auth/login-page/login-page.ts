import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss'
})
export class LoginPage implements OnInit {
    // 'login' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password'
    mode: 'login' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password' = 'login';

    loginData      = { username: '', password: '' };
    signupData     = { username: '', email: '', password: '', confirm: '' };
    forgotEmail    = '';
    resetData      = { newPassword: '', confirm: '' };

    verificationCode = '';
    showResetPassword = false;
    showResetConfirm  = false;

    isLoading = false;
    errorMsg  = '';
    successMsg = '';

    errors: Record<string, string> = {};
    showLoginPassword = false;
    showSignupPassword = false;
    showConfirmPassword = false;

    private readonly EMAIL_REGEX    = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    private readonly PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&_\-.])[A-Za-z\d@$!%*#?&_\-.]{8,}$/;

    constructor(
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.route.queryParamMap.subscribe(params => {
            const requestedMode = params.get('mode');
            const nextMode = requestedMode === 'signup' ? 'signup' : 'login';

            if (this.mode !== nextMode) {
                this.switchMode(nextMode);
            }
        });
    }

    private computeStrength(pass: string) {
        if (!pass) return { level: 0, label: 'Très faible', color: 'bg-slate-700' };
        let points = 0;
        if (pass.length >= 8) points++;
        if (/[A-Z]/.test(pass)) points++;
        if (/\d/.test(pass)) points++;
        if (/[@$!%*#?&_\-.]/.test(pass)) points++;
        if (pass.length >= 12) points++;
        const levels = [
            { label: 'Très faible', color: 'bg-red-500' },
            { label: 'Faible',      color: 'bg-red-400' },
            { label: 'Moyen',       color: 'bg-orange-400' },
            { label: 'Bon',         color: 'bg-yellow-400' },
            { label: 'Fort',        color: 'bg-green-400' },
            { label: 'Excellent',   color: 'bg-emerald-400' }
        ];
        return { level: points, ...levels[points] };
    }

    get passwordStrength() {
        return this.computeStrength(this.signupData.password || '');
    }

    get resetPasswordStrength() {
        return this.computeStrength(this.resetData.newPassword || '');
    }

    // ── CONNEXION ─────────────────────────────────────────────────────────────

    onLogin(): void {
        this.errorMsg = '';
        this.loginData.username = (this.loginData.username || '').trim();
        if (!this.validateLogin()) return;

        this.isLoading = true;
        this.authService.login(this.loginData).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.cdr.detectChanges();
                if (res.role === 'ADMIN') {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/home');
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMsg = err?.status === 401
                    ? 'Identifiants incorrects.'
                    : (err?.error?.error || 'Erreur de connexion serveur.');
                this.cdr.detectChanges();
            }
        });
    }

    // ── INSCRIPTION ───────────────────────────────────────────────────────────

    onSignup(): void {
        this.errorMsg = '';
        this.signupData.username = (this.signupData.username || '').trim();
        this.signupData.email = (this.signupData.email || '').trim().toLowerCase();
        if (!this.validateSignup()) return;

        this.isLoading = true;
        this.authService.sendSignupCode(this.signupData.email, this.signupData.username).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.verificationCode = '';
                this.successMsg = res.message;
                this.mode = 'verify-signup';
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isLoading = false;
                const backendMsg = (err?.error?.error || '').toString();
                if (err?.status === 409) {
                    this.errorMsg = backendMsg.toLowerCase().includes('email')
                        ? 'Adresse mail déjà prise.'
                        : 'Nom d\'utilisateur déjà pris.';
                } else {
                    this.errorMsg = backendMsg || 'Erreur lors de l\'envoi du code.';
                }
                this.cdr.detectChanges();
            }
        });
    }

    onVerifySignup(): void {
        this.errorMsg = '';
        this.signupData.username = (this.signupData.username || '').trim();
        this.signupData.email = (this.signupData.email || '').trim().toLowerCase();
        if (!this.verificationCode || this.verificationCode.length !== 6) {
            this.errorMsg = 'Le code doit contenir 6 chiffres.';
            return;
        }

        this.isLoading = true;
        this.authService.verifySignup({
            username: this.signupData.username,
            email:    this.signupData.email,
            password: this.signupData.password,
            code:     this.verificationCode
        }).subscribe({
            next: () => {
                this.isLoading  = false;
                this.successMsg = 'Compte créé avec succès ! Redirection...';
                this.cdr.detectChanges();
                setTimeout(() => this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/home'), 1000);
            },
            error: (err) => {
                this.isLoading = false;
                const backendMsg = (err?.error?.error || '').toString();
                if (err?.status === 409) {
                    this.errorMsg = backendMsg.toLowerCase().includes('email')
                        ? 'Adresse mail déjà prise.'
                        : 'Nom d\'utilisateur déjà pris.';
                } else {
                    this.errorMsg = backendMsg || 'Code incorrect ou expiré.';
                }
                this.cdr.detectChanges();
            }
        });
    }

    resendSignupCode(): void {
        this.errorMsg  = '';
        this.signupData.username = (this.signupData.username || '').trim();
        this.signupData.email = (this.signupData.email || '').trim().toLowerCase();
        this.isLoading = true;
        this.authService.sendSignupCode(this.signupData.email, this.signupData.username).subscribe({
            next: (res: any) => {
                this.isLoading  = false;
                this.successMsg = res.message;
                this.verificationCode = '';
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.errorMsg  = 'Impossible de renvoyer le code.';
                this.cdr.detectChanges();
            }
        });
    }

    // ── MOT DE PASSE OUBLIÉ ───────────────────────────────────────────────────

    onForgotPassword(): void {
        this.errorMsg = '';
        this.forgotEmail = (this.forgotEmail || '').trim().toLowerCase();
        if (!this.forgotEmail || !this.EMAIL_REGEX.test(this.forgotEmail)) {
            this.errors = { email: 'Adresse mail invalide' };
            return;
        }
        this.isLoading = true;
        this.authService.sendResetCode(this.forgotEmail).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.successMsg = res.message;
                this.verificationCode = '';
                this.resetData = { newPassword: '', confirm: '' };
                this.mode = 'reset-password';
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMsg = err?.error?.error || 'Erreur lors de l\'envoi du code.';
                this.cdr.detectChanges();
            }
        });
    }

    onResetPassword(): void {
        this.errorMsg = '';
        this.errors = {};
        if (!this.verificationCode || this.verificationCode.length !== 6) {
            this.errors['code'] = 'Le code doit contenir 6 chiffres.';
            return;
        }
        if (!this.resetData.newPassword || !this.PASSWORD_REGEX.test(this.resetData.newPassword)) {
            this.errors['newPassword'] = 'Mot de passe trop faible';
            return;
        }
        if (this.resetData.newPassword !== this.resetData.confirm) {
            this.errors['confirm'] = 'Les mots de passe divergent';
            return;
        }
        this.isLoading = true;
        this.authService.resetPassword({
            email: this.forgotEmail,
            code: this.verificationCode,
            newPassword: this.resetData.newPassword
        }).subscribe({
            next: () => {
                this.isLoading = false;
                this.successMsg = 'Mot de passe réinitialisé ! Redirection...';
                this.cdr.detectChanges();
                setTimeout(() => this.switchMode('login'), 1500);
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMsg = err?.error?.error || 'Code incorrect ou expiré.';
                this.cdr.detectChanges();
            }
        });
    }

    resendResetCode(): void {
        this.errorMsg = '';
        this.isLoading = true;
        this.authService.sendResetCode(this.forgotEmail).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.successMsg = res.message;
                this.verificationCode = '';
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMsg = err?.error?.error || 'Impossible de renvoyer le code.';
                this.cdr.detectChanges();
            }
        });
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    switchMode(newMode: 'login' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password'): void {
        this.mode  = newMode;
        this.errorMsg   = '';
        this.successMsg = '';
        this.errors     = {};
        this.verificationCode = '';
        this.cdr.detectChanges();
    }

    private validateLogin(): boolean {
        this.errors = {};
        if (!this.loginData.username) this.errors['username'] = 'Requis';
        if (!this.loginData.password) this.errors['password'] = 'Requis';
        return Object.keys(this.errors).length === 0;
    }

    private validateSignup(): boolean {
        this.errors = {};
        if (!this.signupData.username) this.errors['username'] = 'Requis';
        if (!this.signupData.email || !this.EMAIL_REGEX.test(this.signupData.email)) this.errors['email'] = 'Adresse mail invalide';
        if (!this.signupData.password || !this.PASSWORD_REGEX.test(this.signupData.password)) this.errors['password'] = 'Mot de passe trop faible';
        if (this.signupData.password !== this.signupData.confirm) this.errors['confirm'] = 'Les mots de passe divergent';
        return Object.keys(this.errors).length === 0;
    }
}
