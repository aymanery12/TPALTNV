import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Book } from '../../shared/models/book.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private currentUsername: string | null = localStorage.getItem('auth_username');
  private items$ = new BehaviorSubject<Book[]>(this._load());

  private getKey(): string {
    return this.currentUsername
      ? `bookstore_wishlist_${this.currentUsername}`
      : 'bookstore_wishlist_guest';
  }

  /** Appelé à la connexion/inscription/déconnexion pour charger la bonne wishlist */
  switchUser(username: string | null): void {
    this.currentUsername = username;
    this.items$.next(this._load());
  }

  getWishlist(): Observable<Book[]> {
    return this.items$.asObservable();
  }

  getIds(): Observable<number[]> {
    return this.items$.pipe(map(books => books.map(b => b.id)));
  }

  getIdsSnapshot(): number[] {
    return this.items$.value.map(b => b.id);
  }

  toggle(book: Book): void {
    const current = this.items$.value;
    const exists = current.some(b => b.id === book.id);
    const updated = exists
      ? current.filter(b => b.id !== book.id)
      : [...current, book];
    this._save(updated);
  }

  remove(book: Book): void {
    this._save(this.items$.value.filter(b => b.id !== book.id));
  }

  clear(): void {
    this._save([]);
  }

  private _load(): Book[] {
    try { return JSON.parse(localStorage.getItem(this.getKey()) || '[]'); }
    catch { return []; }
  }

  private _save(books: Book[]): void {
    localStorage.setItem(this.getKey(), JSON.stringify(books));
    this.items$.next(books);
  }
}
