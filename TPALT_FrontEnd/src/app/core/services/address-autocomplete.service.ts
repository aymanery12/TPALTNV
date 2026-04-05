import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface AddressApiResponse {
  features?: Array<{
    properties?: {
      label?: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AddressAutocompleteService {
  private readonly apiUrl = 'https://api-adresse.data.gouv.fr/search/';

  constructor(private http: HttpClient) {}

  searchFrenchAddresses(query: string, limit = 6): Observable<string[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return of([]);
    }

    const params = new HttpParams()
      .set('q', trimmedQuery)
      .set('limit', String(limit))
      .set('autocomplete', '1')
      .set('type', 'housenumber');

    return this.http.get<AddressApiResponse>(this.apiUrl, { params }).pipe(
      map(response => {
        const labels = (response.features ?? [])
          .map(feature => feature.properties?.label?.trim() ?? '')
          .filter(label => !!label);

        // Remove duplicates while preserving order.
        return Array.from(new Set(labels));
      })
    );
  }
}
