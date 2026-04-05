import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Book } from '../../models/book.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="book-card group flex flex-col h-full bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <!-- Book Cover Image -->
      <div class="aspect-[3/4] mb-3 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 relative cursor-pointer group/image">
        <img
            alt="{{ book.title }}"
            class="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-300"
            [src]="book.coverImageUrl || book.imageUrl"
            loading="lazy"
            referrerpolicy="no-referrer"
            (error)="$any($event.target).src='book-placeholder.svg'"
            (click)="onBookClick()"
        />

        <!-- Badge -->
        <div
            *ngIf="badge"
            class="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded"
            [ngClass]="getBadgeClass()">
          {{ badge }}
        </div>

        <div *ngIf="isSoldOut"
             class="absolute inset-0 sold-out-overlay flex items-center justify-center">
          <span class="sold-out-chip">{{ t('bookCard.soldOut') }}</span>
        </div>

        <!-- Wishlist Button -->
        <button
            class="absolute top-2 left-2 opacity-0 group-hover/image:opacity-100 transition-opacity bg-white rounded-full p-1.5 hover:bg-slate-100 shadow-md"
            (click)="onWishlistClick()"
            [class.bg-red-100]="isInWishlist"
            title="Add to wishlist">
          <span class="material-symbols-outlined text-lg"
                [class.icon-filled]="isInWishlist"
                [class.text-red-500]="isInWishlist"
                [class.text-slate-400]="!isInWishlist">favorite</span>
        </button>
      </div>

      <!-- Book Info -->
      <div class="flex-1 flex flex-col">
        <!-- Title -->
        <h3
            class="text-sm font-bold leading-snug line-clamp-2 hover:text-primary cursor-pointer mb-1"
            (click)="onBookClick()">
          {{ book.title }}
        </h3>

        <!-- Author(s) -->
        <p *ngIf="getAuthorsDisplay()" class="text-[13px] text-slate-500 mb-1">
          {{ t('bookCard.by') }} {{ getAuthorsDisplay() }}
        </p>

        <!-- Rating -->
        <div class="mb-2 flex items-center gap-1.5">
          <span
              *ngFor="let i of starSlots"
              class="material-symbols-outlined text-base leading-none rating-star"
              [class.rating-star-filled]="i <= filledStarCount">
            star
          </span>
          <span class="text-xs text-slate-500">({{ reviewCountDisplay }})</span>
        </div>

        <!-- Price Section -->
        <div class="mt-auto">
          <div
              class="flex items-baseline gap-1"
              [ngClass]="{ 'text-red-600': book.discount }">
            <span class="text-xl font-bold">{{ getDisplayPrice() | number: '1.0-0' }}</span>
            <span class="text-xs font-bold">{{ getDisplayPriceCents() }}</span>
            <span class="text-xs font-bold self-start mt-1">€</span>
          </div>

          <!-- Original price if on sale -->
          <p *ngIf="book.discount" class="text-[10px] text-slate-500 mb-2">
            Was: {{ book.price | number: '1.2-2' }}
          </p>

          <!-- Add to Cart Button -->
          <button
              class="w-full mt-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 text-xs font-bold py-1.5 rounded-full transition-colors shadow-sm"
              [disabled]="isSoldOut"
              [class.opacity-50]="isSoldOut"
              [class.cursor-not-allowed]="isSoldOut"
              (click)="onAddToCart()">
            {{ isSoldOut ? t('bookCard.soldOut') : t('bookCard.addToCart') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './book-card.scss'
})
export class BookCardComponent {
    get isSoldOut(): boolean {
      if (this.book?.inStock === false) return true;
      const status = (this.book?.status ?? '').toUpperCase();
      if (status === 'OUT_OF_STOCK' || status === 'DISCONTINUED') return true;
      if (typeof this.book?.quantity === 'number' && this.book.quantity <= 0) return true;
      return false;
    }

  starSlots = [1, 2, 3, 4, 5];

  @Input() book!: Book;
  @Input() badge?: string;
  @Input() isInWishlist: boolean = false;

  @Output() bookClicked = new EventEmitter<Book>();
  @Output() addToCartClicked = new EventEmitter<Book>();
  @Output() wishlistToggled = new EventEmitter<Book>();

  constructor(public languageService: LanguageService) {}

  get filledStarCount(): number {
    const avg = this.book?.rating ?? 0;
    if (!Number.isFinite(avg)) return 0;
    return Math.max(0, Math.min(5, Math.round(avg)));
  }

  get reviewCountDisplay(): number {
    return this.book?.reviewCount ?? 0;
  }

  getAuthorsDisplay(): string {
    if (this.book.authors && this.book.authors.length > 0) {
      return this.book.authors.map(a => a.name).join(', ');
    }
    if (this.book.author && this.book.author.length > 0) {
      return this.book.author.join(', ');
    }
    return '';
  }

  onBookClick(): void { this.bookClicked.emit(this.book); }
  onAddToCart(): void { this.addToCartClicked.emit(this.book); }

  onWishlistClick(): void {
    this.isInWishlist = !this.isInWishlist;
    this.wishlistToggled.emit(this.book);
  }

  getDisplayPrice(): number {
    return Math.floor(this.getEffectivePrice());
  }

  getDisplayPriceCents(): string {
    return this.getEffectivePrice().toFixed(2).split('.')[1];
  }

  private getEffectivePrice(): number {
    const price = this.book.price ?? 0;
    const discount = this.book.discount ?? 0;
    return discount > 0 ? price * (1 - discount / 100) : price;
  }

  getBadgeClass(): string {
    if (this.badge?.includes('SAVE')) return 'bg-red-600';
    if (this.badge?.includes('BEST')) return 'bg-primary';
    return 'bg-slate-700';
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
