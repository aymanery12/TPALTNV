import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { Book } from '../../../shared/models';
import { WishlistService } from '../../../core/services/wishlist.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.scss'
})
export class WishlistPage implements OnInit {
  wishlist: Book[] = [];
  currentLang = 'fr';

  constructor(
    private wishlistService: WishlistService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.currentLanguage;
    this.languageService.currentLanguageChanges().subscribe(lang => {
      this.currentLang = lang;
    });

    this.wishlistService.getWishlist().subscribe(books => {
      this.wishlist = books;
    });
  }

  removeFromWishlist(book: Book): void {
    this.wishlistService.remove(book);
  }

  clearWishlist(): void {
    this.wishlistService.clear();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  hasDiscount(book: Book): boolean {
    return Number(book.discount ?? 0) > 0;
  }

  discountedPrice(book: Book): number {
    const base = Number(book.price) || 0;
    const discount = Math.min(100, Math.max(0, Number(book.discount ?? 0)));
    return base * (1 - discount / 100);
  }

  isOutOfStock(book: Book): boolean {
    const status = (book.status ?? '').toUpperCase();
    if (status === 'OUT_OF_STOCK' || status === 'DISCONTINUED') return true;

    const qty = book.quantity;
    if (typeof qty === 'number' && Number.isFinite(qty)) return qty <= 0;

    return book.inStock === false;
  }
}
