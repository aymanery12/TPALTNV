import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Book } from '../../models/book.model';
import { RatingComponent } from '../rating/rating';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterModule, RatingComponent],
  template: `
    <div class="book-card group flex flex-col h-full bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <!-- Book Cover Image -->
      <div class="aspect-[3/4] mb-3 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 relative cursor-pointer group/image">
        <img
            alt="{{ book.title }}"
            class="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-300"
            [src]="book.coverImageUrl || book.imageUrl"
            (click)="onBookClick()"
        />

        <!-- Badge -->
        <div
            *ngIf="badge"
            class="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded"
            [ngClass]="getBadgeClass()">
          {{ badge }}
        </div>

        <!-- Wishlist Button -->
        <button
            class="absolute top-2 left-2 opacity-0 group-hover/image:opacity-100 transition-opacity bg-white rounded-full p-1.5 hover:bg-slate-100 shadow-md"
            (click)="onWishlistClick()"
            [class.bg-red-100]="isInWishlist"
            title="Add to wishlist">
          <span class="material-symbols-outlined text-lg" [class.fill-1]="isInWishlist">favorite</span>
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
        <p class="text-xs text-slate-500 mb-1">
          by {{ getAuthorsDisplay() }}
        </p>

        <!-- Rating -->
        <div class="mb-2">
          <app-rating
              [rating]="book.rating"
              [reviewCount]="book.reviewCount ?? 0"
              [showCount]="true"
              [interactive]="false">
          </app-rating>
        </div>

        <!-- Price Section -->
        <div class="mt-auto">
          <div
              class="flex items-baseline gap-1"
              [ngClass]="{ 'text-red-600': book.discount }">
            <span class="text-xs font-bold self-start mt-1">€</span>
            <span class="text-xl font-bold">{{ getDisplayPrice() | number: '1.0-0' }}</span>
            <span class="text-xs font-bold">{{ getDisplayPriceCents() }}</span>
          </div>

          <!-- Original price if on sale -->
          <p *ngIf="book.discount" class="text-[10px] text-slate-500 mb-2">
            Was: {{ (book.price / (1 - book.discount! / 100)) | number: '1.2-2' }}
          </p>

          <!-- Delivery Info — set once in ngOnInit, no random on each CD cycle -->
          <p class="text-[10px] text-slate-500 mb-3">
            {{ deliveryText }}
          </p>

          <!-- Add to Cart Button -->
          <button
              class="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 text-xs font-bold py-1.5 rounded-full transition-colors shadow-sm"
              (click)="onAddToCart()">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './book-card.scss'
})
export class BookCardComponent implements OnInit {
  @Input() book!: Book;
  @Input() badge?: string;
  @Input() isInWishlist: boolean = false;

  @Output() bookClicked = new EventEmitter<Book>();
  @Output() addToCartClicked = new EventEmitter<Book>();
  @Output() wishlistToggled = new EventEmitter<Book>();

  // Computed once — no more random value on every change-detection cycle
  deliveryText = '';

  ngOnInit(): void {
    const messages = [
      'FREE Delivery Tomorrow',
      'Prime Member Deal',
      'Hardcover Edition',
      'Kindle Available'
    ];
    this.deliveryText = messages[Math.floor(Math.random() * messages.length)];
  }

  getAuthorsDisplay(): string {
    if (this.book.authors && this.book.authors.length > 0) {
      return this.book.authors.map(a => a.name).join(', ');
    }
    if (this.book.author && this.book.author.length > 0) {
      return this.book.author.join(', ');
    }
    return 'Unknown';
  }

  onBookClick(): void { this.bookClicked.emit(this.book); }
  onAddToCart(): void { this.addToCartClicked.emit(this.book); }

  onWishlistClick(): void {
    this.isInWishlist = !this.isInWishlist;
    this.wishlistToggled.emit(this.book);
  }

  getDisplayPrice(): number {
    return this.book.discount
      ? Math.floor(this.book.price * (1 - this.book.discount / 100))
      : Math.floor(this.book.price);
  }

  getDisplayPriceCents(): string {
    const cents = Math.round((this.book.price % 1) * 100);
    return cents.toString().padStart(2, '0');
  }

  getBadgeClass(): string {
    if (this.badge?.includes('SAVE')) return 'bg-red-600';
    if (this.badge?.includes('BEST')) return 'bg-primary';
    return 'bg-slate-700';
  }
}
