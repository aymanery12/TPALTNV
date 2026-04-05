import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Book } from '../../shared/models/book.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private currentUsername: string | null = localStorage.getItem('auth_username');
  private items$ = new BehaviorSubject<CartItem[]>(this.loadFromStorage());

  constructor() {}

  private getKey(): string {
    return this.currentUsername
      ? `bookstore_cart_${this.currentUsername}`
      : 'bookstore_cart_guest';
  }

  /** Appelé à la connexion/inscription/déconnexion pour charger le bon panier */
  switchUser(username: string | null): void {
    this.currentUsername = username;
    this.items$.next(this.loadFromStorage());
  }

  // ── Observables ─────────────────────────────────────────────────────────────

  getCartItems(): Observable<CartItem[]> {
    return this.items$.asObservable();
  }

  getItemCount(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((sum, i) => sum + i.quantity, 0)));
  }

  getCartTotal(): Observable<number> {
    return this.items$.pipe(
      map(items => items.reduce((sum, i) => sum + this.getEffectivePrice(i.book) * i.quantity, 0))
    );
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  addToCart(book: Book, quantity: number = 1): { added: boolean; reason?: 'OUT_OF_STOCK' | 'LIMIT_REACHED'; maxAvailable?: number } {
    const current = this.items$.value;
    const existing = current.find(i => i.book.id === book.id);
    const availableStock = this.getAvailableStock(book);
    const currentQty = existing?.quantity ?? 0;

    if (availableStock <= 0) {
      return { added: false, reason: 'OUT_OF_STOCK', maxAvailable: 0 };
    }

    const desiredQty = currentQty + Math.max(1, quantity);
    if (desiredQty > availableStock) {
      const safeQty = availableStock;
      if (existing) {
        this.update(current.map(i => i.book.id === book.id ? { ...i, quantity: safeQty } : i));
      } else if (safeQty > 0) {
        this.update([...current, { id: String(book.id), book, quantity: safeQty, addedAt: new Date() }]);
      }
      return { added: false, reason: 'LIMIT_REACHED', maxAvailable: availableStock };
    }

    const updated: CartItem[] = existing
      ? current.map(i => i.book.id === book.id ? { ...i, quantity: i.quantity + quantity } : i)
      : [...current, { id: String(book.id), book, quantity, addedAt: new Date() }];

    this.update(updated);
    return { added: true, maxAvailable: availableStock };
  }

  removeFromCart(itemId: string): void {
    this.update(this.items$.value.filter(i => i.id !== itemId));
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) { this.removeFromCart(itemId); return; }
    this.update(this.items$.value.map(i => {
      if (i.id !== itemId) return i;

      const maxStock = this.getAvailableStock(i.book);
      const safeQty = Number.isFinite(maxStock) ? Math.min(quantity, maxStock) : quantity;
      return { ...i, quantity: Math.max(1, safeQty) };
    }));
  }

  clearCart(): void {
    this.update([]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private update(items: CartItem[]): void {
    this.items$.next(items);
    localStorage.setItem(this.getKey(), JSON.stringify(items));
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.getKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAvailableStock(book: Book): number {
    const status = (book.status ?? 'ACTIVE').toUpperCase();
    if (status === 'OUT_OF_STOCK' || status === 'DISCONTINUED') return 0;

    const qty = book.quantity;
    if (typeof qty !== 'number' || !Number.isFinite(qty)) return Number.POSITIVE_INFINITY;
    return Math.max(0, qty);
  }

  private getEffectivePrice(book: Book): number {
    const basePrice = Number(book.price) || 0;
    const discount = Math.min(100, Math.max(0, Number(book.discount) || 0));
    return basePrice * (1 - discount / 100);
  }
}
