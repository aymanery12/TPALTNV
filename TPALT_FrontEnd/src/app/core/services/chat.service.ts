import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    /**
     * POST /api/chat/ask?message=...
     * Requires JWT authentication (handled by AuthInterceptor)
     */
    ask(message: string): Observable<string> {
        const params = new HttpParams().set('message', message);
        return this.http.get(`${this.apiUrl}/chat/ask`, {
            params,
            responseType: 'text'
        }).pipe(timeout(55000));
    }

    getBookSummary(bookId: number): Observable<string> {
        return this.http.get(`${this.apiUrl}/chat/summary/${bookId}`, {
            responseType: 'text'
        }).pipe(timeout(55000));
    }
}