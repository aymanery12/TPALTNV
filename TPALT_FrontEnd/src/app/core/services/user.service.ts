import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Wishlist } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private isAuthenticated$ = new BehaviorSubject<boolean>(false);
  private wishlist$ = new BehaviorSubject<Wishlist | null>(null);

  constructor() {
    // TODO: Load user from localStorage or API
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  login(email: string, password: string): Observable<User> {
    // TODO: Implement login logic
    return this.currentUser$.asObservable() as Observable<User>;
  }

  logout(): void {
    // TODO: Clear user session
    this.currentUser$.next(null);
    this.isAuthenticated$.next(false);
  }

  register(user: Partial<User>): Observable<User> {
    // TODO: Implement registration logic
    return this.currentUser$.asObservable() as Observable<User>;
  }

  updateProfile(user: Partial<User>): Observable<User> {
    // TODO: Update user profile
    return this.currentUser$.asObservable() as Observable<User>;
  }

  getWishlist(): Observable<Wishlist | null> {
    return this.wishlist$.asObservable();
  }

  addToWishlist(bookId: string): Observable<Wishlist | null> {
    // TODO: Add book to wishlist
    return this.wishlist$.asObservable();
  }

  removeFromWishlist(bookId: string): Observable<Wishlist | null> {
    // TODO: Remove book from wishlist
    return this.wishlist$.asObservable();
  }
}
