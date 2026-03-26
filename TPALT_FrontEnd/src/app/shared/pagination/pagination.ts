import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: "app-pagination",
  imports: [CommonModule],
  templateUrl: "./pagination.html",
  styleUrl: "./pagination.scss",
})
export class Pagination {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const WINDOW = 3; // pages visibles dans la fenêtre glissante

    // Fenêtre centrée sur current, clampée
    let left = Math.max(1, current - Math.floor(WINDOW / 2));
    let right = left + WINDOW - 1;
    if (right > total) {
      right = total;
      left = Math.max(1, right - WINDOW + 1);
    }

    const result: (number | string)[] = [];

    // Si la fenêtre ne commence pas à 1 → "..." à la place
    if (left > 1) {
      result.push('...');
    }

    for (let i = left; i <= right; i++) {
      result.push(i);
    }

    // Si la fenêtre ne termine pas à total → "..." à la place
    if (right < total) {
      result.push('...');
    }

    return result;
  }

  isNumber(val: number | string): val is number {
    return typeof val === 'number';
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }
}