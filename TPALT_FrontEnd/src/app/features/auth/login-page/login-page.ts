import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss'
})
export class LoginPage {
    mode: 'login' | 'signup' = 'login';

    loginData = { username: '', password: '' };
    signupData = { username: '', email: '', password: '', confirm: '' };

    isLoading = false;
    errorMsg = '';
    successMsg = '';

    errors: Record<string, string> = {};

    // Correction des Regex (suppression des caractères \r\n invisibles et des doubles anti-slashs)
    private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    private readonly PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&_\-.])[A-Za-z\d@$!%*#?&_\-.]{8,}$/;

    constructor(
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    // Ajout de la propriété manquante pour la barre de force du mot de passe
    get passwordStrength() {
        const pass = this.signupData.password || '';
        if (!pass) return { level: 0, label: 'Très faible', color: 'bg-slate-700' };

        let points = 0;
        if (pass.length >= 8) points++;
        if (/[A-Z]/.test(pass)) points++;
        if (/\d/.test(pass)) points++;
        if (/[@$!%*#?&_\-.]/.test(pass)) points++;
        if (pass.length >= 12) points++;

        const levels = [
            { label: 'Très faible', color: 'bg-red-500' },
            { label: 'Faible', color: 'bg-red-400' },
            { label: 'Moyen', color: 'bg-orange-400' },
            { label: 'Bon', color: 'bg-yellow-400' },
            { label: 'Fort', color: 'bg-green-400' },
            { label: 'Excellent', color: 'bg-emerald-400' }
        ];

        return {
            level: points,
            ...levels[points]
        };
    }

    onLogin(): void {
        this.errorMsg = '';
        if (!this.validateLogin()) return;

        this.isLoading = true;
        this.authService.login(this.loginData).subscribe({
            next: (res: any) => {
                this.isLoading = false;
                this.cdr.detectChanges();

                if (res.role === 'ADMIN') {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/home']);
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.cdr.detectChanges();
                this.errorMsg = err?.status === 401
                    ? 'Identifiants incorrects.'
                    : 'Erreur de connexion serveur.';
            }
        });
    }

    onSignup(): void {
        this.errorMsg = '';
        if (!this.validateSignup()) return;

        this.isLoading = true;
        this.authService.register({
            username: this.signupData.username,
            email: this.signupData.email,
            password: this.signupData.password
        }).subscribe({
            next: () => {
                this.isLoading = false;
                this.successMsg = 'Compte créé ! Redirection...';
                this.cdr.detectChanges();
                setTimeout(() => this.switchMode('login'), 1500);
            },
            error: (err) => {
                this.isLoading = false;
                this.cdr.detectChanges();
                if (err?.status === 409) {
                    this.errorMsg = 'Nom d\'utilisateur déjà pris.';
                } else if (err?.status === 400) {
                    this.errorMsg = err?.error?.error || 'Données invalides.';
                } else {
                    this.errorMsg = 'Erreur serveur. Réessayez.';
                }
            }
        });
    }

    switchMode(newMode: 'login' | 'signup'): void {
        this.mode = newMode;
        this.errorMsg = '';
        this.successMsg = '';
        this.errors = {};
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
        if (!this.signupData.email || !this.EMAIL_REGEX.test(this.signupData.email)) this.errors['email'] = 'Email invalide';
        if (!this.signupData.password || !this.PASSWORD_REGEX.test(this.signupData.password)) this.errors['password'] = 'Mot de passe trop faible';
        if (this.signupData.password !== this.signupData.confirm) this.errors['confirm'] = 'Les mots de passe divergent';
        return Object.keys(this.errors).length === 0;
    }
}