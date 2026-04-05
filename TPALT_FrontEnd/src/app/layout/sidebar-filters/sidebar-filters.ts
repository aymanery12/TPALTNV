import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';

export interface PriceRange { min?: number; max?: number; label: string; }

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-filters.html',
  styleUrl: './sidebar-filters.scss',
})
export class SidebarFilters implements OnInit {

  readonly offersCategoryValue = '__offers__';

  @Output() categorySelected = new EventEmitter<string>();
  @Output() priceSelected    = new EventEmitter<PriceRange>();

  categories: string[] = [];
  activeCategory = '';
  activePrice: PriceRange | null = null;

  readonly priceRanges: PriceRange[] = [
    { max: 10,           label: 'sidebar.lessThan10'   },
    { min: 10, max: 25,  label: 'sidebar.between10and25'     },
    { min: 25, max: 50,  label: 'sidebar.between25and50'     },
    { min: 50, max: 100, label: 'sidebar.between50and100'    },
  ];

  constructor(private http: HttpClient, public languageService: LanguageService) {}

  ngOnInit(): void {
    this.http.get<string[]>(`${environment.apiUrl}/books/categories`).subscribe({
      next: cats => { this.categories = [this.offersCategoryValue, ...cats]; },
      error: ()  => { this.categories = [this.offersCategoryValue]; }
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

  translateCategory(cat: string): string {
    return this.languageService.categoryLabel(cat);
  }

  translatePriceRange(range: PriceRange): string {
    return this.languageService.t(range.label);
  }
}
