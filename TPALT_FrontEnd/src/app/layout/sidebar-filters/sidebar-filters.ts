import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-filters.html',
  styleUrl: './sidebar-filters.scss',
})
export class SidebarFilters {
  constructor(private router: Router) {}

  goCategory(category: string): void {
    this.router.navigate(['/catalog'], { queryParams: { category } });
  }

  goRating(min: number): void {
    this.router.navigate(['/catalog'], { queryParams: { minRating: min } });
  }

  goPrice(min?: number, max?: number): void {
    const params: any = {};
    if (min !== undefined) params['minPrice'] = min;
    if (max !== undefined) params['maxPrice'] = max;
    this.router.navigate(['/catalog'], { queryParams: params });
  }
}
