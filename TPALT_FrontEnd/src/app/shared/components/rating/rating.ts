import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1">

      <!-- Stars -->
      <div class="flex text-amber-400">
        <span
            *ngFor="let i of [1,2,3,4,5]"
            class="material-symbols-outlined text-sm transition-transform"
            [class.cursor-pointer]="interactive"
            [class.hover:scale-125]="interactive"
            [style.color]="getStarColor(i)"
            (click)="onStarClick(i)"
            [title]="interactive ? i + ' étoile(s)' : ''">
          {{ getStarIcon(i) }}
        </span>
      </div>

      <!-- Review count -->
      <span *ngIf="showCount && reviewCount > 0"
            class="text-[11px] text-primary hover:underline cursor-pointer ml-1">
        {{ reviewCount }}
      </span>
    </div>
  `,
  styleUrl: './rating.scss'
})
export class RatingComponent {
  @Input() rating: number = 0;
  @Input() reviewCount: number = 0;
  @Input() showCount: boolean = true;
  @Input() interactive: boolean = false;

  // ✅ Event émis quand l'utilisateur clique sur une étoile
  @Output() ratingChanged = new EventEmitter<number>();

  getStarIcon(i: number): string {
    if (i <= Math.floor(this.rating)) return 'star';
    if (i === Math.ceil(this.rating) && this.rating % 1 >= 0.5) return 'star_half';
    return 'star_border';
  }

  getStarColor(i: number): string {
    if (i <= Math.floor(this.rating)) return '#f59e0b';           // pleine
    if (i === Math.ceil(this.rating) && this.rating % 1 >= 0.5) return '#f59e0b'; // demi
    return '#cbd5e1';                                              // vide
  }

  onStarClick(stars: number): void {
    if (!this.interactive) return;
    this.rating = stars;
    this.ratingChanged.emit(stars); // ✅ notifie le parent
  }
}