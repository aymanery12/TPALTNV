import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Book } from '../../shared/models/book.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly KEY = 'bookstore_wishlist';
  private items$ = new BehaviorSubject<Book[]>(this._load());

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
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  }

  private _save(books: Book[]): void {
    localStorage.setItem(this.KEY, JSON.stringify(books));
    this.items$.next(books);
  }
}
