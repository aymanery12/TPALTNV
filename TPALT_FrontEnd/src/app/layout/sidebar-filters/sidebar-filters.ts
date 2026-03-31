import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PriceRange { min?: number; max?: number; label: string; }

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-filters.html',
  styleUrl: './sidebar-filters.scss',
})
export class SidebarFilters implements OnInit {

  @Output() categorySelected = new EventEmitter<string>();
  @Output() priceSelected    = new EventEmitter<PriceRange>();

  categories: string[] = [];
  activeCategory = '';
  activePrice: PriceRange | null = null;

  readonly priceRanges: PriceRange[] = [
    { max: 10,           label: 'Moins de 10 €'   },
    { min: 10, max: 25,  label: '10 € à 25 €'     },
    { min: 25, max: 50,  label: '25 € à 50 €'     },
    { min: 50, max: 100, label: '50 € à 100 €'    },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<string[]>(`${environment.apiUrl}/books/categories`).subscribe({
      next: cats => { this.categories = cats; },
      error: ()  => { this.categories = []; }
    });
  }

  selectCategory(cat: string): void {
    this.activeCategory = this.activeCategory === cat ? '' : cat;
    this.categorySelected.emit(this.activeCategory);
  }

selectPrice(range: PriceRange): void {
    this.activePrice = this.activePrice?.label === range.label ? null : range;
    this.priceSelected.emit(this.activePrice ?? { label: '' });
  }
}
