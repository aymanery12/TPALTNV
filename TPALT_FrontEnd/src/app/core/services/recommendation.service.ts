import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Book } from '../../shared/models/book.model';

export interface RecommendationResult {
  type: 'personalized' | 'cold_start';
  books: Book[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getRecommendations(): Observable<RecommendationResult> {
    return this.http.get<RecommendationResult>(`${this.apiUrl}/recommendations`);
  }
}
