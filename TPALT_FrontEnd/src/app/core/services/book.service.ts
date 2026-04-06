import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Book, BookReview } from '../../shared/models/book.model';

export interface BestSellerBook {
  id: number;
  title: string;
  soldCount: number;
  price: number;
  finalPrice: number;
  rating: number;
}

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

  // GET /api/books/best-sellers?limit=...
  getBestSellers(limit = 5): Observable<BestSellerBook[]> {
    return this.http.get<BestSellerBook[]>(`${this.apiUrl}/books/best-sellers?limit=${limit}`);
  }

  // GET /api/books/{bookId}/reviews
  getReviews(bookId: number): Observable<BookReview[]> {
    return this.http.get<BookReview[]>(`${this.apiUrl}/books/${bookId}/reviews`);
  }

  // GET /api/reviews/average
  getAverageReviewRating(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/reviews/average`);
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