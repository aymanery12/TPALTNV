import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthRequest, AuthResponse, RegisterRequest, User } from '../../shared/models/user.model';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private isAuthenticated$ = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router, private cartService: CartService) {}

  // Force une session propre à chaque redémarrage de l'application.
  clearSessionOnAppStart(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_username');
    this.isAuthenticated$.next(false);
    this.cartService.switchUser(null);
  }

  // Connexion : vérifie identifiants + retourne JWT directement
  login(credentials: AuthRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
        tap(response => {
          localStorage.setItem('auth_token',    response.token);
          localStorage.setItem('auth_role',     response.role);
          localStorage.setItem('auth_username', response.username);
          this.isAuthenticated$.next(true);
          this.cartService.switchUser(response.username);
        })
    );
  }

  // Étape 1 inscription : envoie le code de vérification par email
  sendSignupCode(email: string, username: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/send-code/signup`, { email, username });
  }

  // Étape 2 inscription : vérifie le code + crée le compte + retourne JWT
  verifySignup(data: { username: string; email: string; password: string; code: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-signup`, data).pipe(
        tap(response => {
          localStorage.setItem('auth_token',    response.token);
          localStorage.setItem('auth_role',     response.role);
          localStorage.setItem('auth_username', response.username);
          this.isAuthenticated$.next(true);
          this.cartService.switchUser(response.username);
        })
    );
  }

  register(data: RegisterRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/signup`, data);
  }

  logout(): void {
    this.clearSessionOnAppStart();
    this.router.navigate(['/home']);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getRole(): string | null {
    return localStorage.getItem('auth_role');
  }

  getUsername(): string | null {
    return localStorage.getItem('auth_username');
  }

  hasToken(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  isLoggedInSnapshot(): boolean {
    return this.isAuthenticated$.value;
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }
}