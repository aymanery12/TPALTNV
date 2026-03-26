import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Book, BookReview } from '../../shared/models/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET /api/books
  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/books`);
  }

  // GET /api/books/{id}
  getBookById(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/books/${id}`);
  }

  // GET /api/books/search?keyword=...
  searchBooks(keyword: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/books/search?keyword=${keyword}`);
  }

  // GET /api/books/category/{category}
  getBooksByCategory(category: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.apiUrl}/books/category/${category}`);
  }

  // GET /api/books/{bookId}/reviews
  getReviews(bookId: number): Observable<BookReview[]> {
    return this.http.get<BookReview[]>(`${this.apiUrl}/books/${bookId}/reviews`);
  }

  // POST /api/books/{bookId}/reviews  (authentifié)
  addReview(bookId: number, review: { rating: number; comment: string }): Observable<BookReview> {
    return this.http.post<BookReview>(`${this.apiUrl}/books/${bookId}/reviews`, review);
  }

  // GET /api/chat/summary/{bookId}  (authentifié)
  getAiSummary(bookId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/chat/summary/${bookId}`, { responseType: 'text' });
  }
}