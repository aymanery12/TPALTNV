import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../models/book.model';
import { BookCardComponent } from '../book-card/book-card';

@Component({
  selector: 'app-book-grid',
  standalone: true,
  imports: [CommonModule, BookCardComponent],
  template: `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <app-book-card
          *ngFor="let book of books"
          [book]="book"
          [badge]="getBadgeForBook(book)"
          [isInWishlist]="wishlistBookIds.includes(book.id)"
          (bookClicked)="onBookClicked($event)"
          (addToCartClicked)="onAddToCart($event)"
          (wishlistToggled)="onWishlistToggled($event)">
      </app-book-card>
    </div>
  `,
  styleUrl: './book-grid.scss'
})
export class BookGridComponent {
  @Input() books: Book[] = [];
  @Input() wishlistBookIds: number[] = [];

  @Output() bookSelected = new EventEmitter<Book>();
  @Output() addToCart = new EventEmitter<Book>();
  @Output() wishlistToggled = new EventEmitter<Book>();

  getBadgeForBook(book: Book): string | undefined {
    if (book.discount && book.discount > 15) {
      return `SAVE ${book.discount}%`;
    }
    if ((book.reviewCount ?? 0) > 1000) {
      return 'BEST SELLER';
    }
    return undefined;
  }

  onBookClicked(book: Book): void {
    this.bookSelected.emit(book);
  }

  onAddToCart(book: Book): void {
    this.addToCart.emit(book);
  }

  onWishlistToggled(book: Book): void {
    this.wishlistToggled.emit(book);
  }
}