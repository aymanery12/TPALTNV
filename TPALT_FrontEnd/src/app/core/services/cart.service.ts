import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Book } from '../../shared/models/book.model';

const CART_KEY = 'bookstore_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private items$ = new BehaviorSubject<CartItem[]>(this.loadFromStorage());

  constructor() {}

  // ── Observables ─────────────────────────────────────────────────────────────

  getCartItems(): Observable<CartItem[]> {
    return this.items$.asObservable();
  }

  getItemCount(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  }

  getCartTotal(): Observable<number> {
    return this.items$.pipe(
      map(items => items.reduce((sum, i) => sum + i.book.price * i.quantity, 0))
    );
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  addToCart(book: Book, quantity: number = 1): void {
    const current = this.items$.value;
    const existing = current.find(i => i.book.id === book.id);

    const updated: CartItem[] = existing
      ? current.map(i => i.book.id === book.id ? { ...i, quantity: i.quantity + quantity } : i)
      : [...current, { id: String(book.id), book, quantity, addedAt: new Date() }];

    this.update(updated);
  }

  removeFromCart(itemId: string): void {
    this.update(this.items$.value.filter(i => i.id !== itemId));
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) { this.removeFromCart(itemId); return; }
    this.update(this.items$.value.map(i => i.id === itemId ? { ...i, quantity } : i));
  }

  clearCart(): void {
    this.update([]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private update(items: CartItem[]): void {
    this.items$.next(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
