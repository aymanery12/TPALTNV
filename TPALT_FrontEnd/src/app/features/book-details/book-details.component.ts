import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../core/services/book.service';
import { CartService } from '../../core/services/cart.service';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { LanguageService } from '../../core/services/language.service';
import { Book, BookReview } from '../../shared/models/book.model';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Navbar, Footer],
  template: `
    <div class="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      <app-navbar></app-navbar>

      <!-- Toast -->
      <div *ngIf="toastVisible"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">check_circle</span>{{ toastMsg }}
      </div>

      <main class="flex-1 max-w-[1200px] mx-auto w-full p-4 md:p-8">

        <!-- Not found -->
        <div *ngIf="!isLoading && !book" class="text-center py-32 text-slate-400">
          <span class="material-symbols-outlined text-6xl mb-4 block">book_off</span>
          <p class="text-xl font-bold">{{ t('bookDetails.notFound') }}</p>
          <a routerLink="/catalog" class="mt-4 inline-block text-amber-400 hover:underline">{{ t('bookDetails.backToCatalog') }}</a>
        </div>

        <!-- Book details -->
        <div *ngIf="!isLoading && book">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <a routerLink="/home" class="hover:text-white transition-colors">{{ t('bookDetails.breadcrumb.home') }}</a>
            <span>›</span>
            <a routerLink="/catalog" class="hover:text-white transition-colors">{{ t('bookDetails.breadcrumb.catalog') }}</a>
            <span>›</span>
            <span class="text-white truncate max-w-xs">{{ book.title }}</span>
          </nav>

          <!-- Main info -->
          <div class="flex flex-col md:flex-row gap-10 mb-12">

            <!-- Cover -->
            <div class="shrink-0">
              <div class="w-56 h-80 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 mx-auto md:mx-0">
                <img [src]="book.imageUrl || book.coverImageUrl"
                     [alt]="book.title"
                     referrerpolicy="no-referrer"
                     (error)="$any($event.target).src='book-placeholder.svg'"
                     class="w-full h-full object-cover">
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1">
              <span class="inline-block bg-amber-400/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full mb-3">
                {{ translateCategory(book.category) }}
              </span>

              <h1 class="text-3xl font-bold text-white mb-2">{{ book.title }}</h1>

              <p class="text-slate-400 mb-4">
                {{ t('bookDetails.by') }} <span class="text-white font-medium">
                  {{ book.author?.join(', ') || t('bookDetails.unknownAuthor') }}
                </span>
              </p>

              <!-- Stars -->
              <div class="flex items-center gap-2 mb-4">
                <div class="flex gap-0.5">
                  <span *ngFor="let i of [1,2,3,4,5]"
                        class="material-symbols-outlined text-xl"
                        [class.text-amber-400]="i <= bookRating"
                        [class.text-slate-600]="i > bookRating"
                        [class.star-filled]="i <= bookRating">star</span>
                </div>
                <span class="text-slate-400 text-sm">{{ bookRatingLabel }}/5</span>
                <span class="text-slate-500 text-sm">({{ reviews.length }} {{ t('bookDetails.reviewsLabel') }})</span>
              </div>

              <!-- Price -->
              <div class="mb-6">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-bold text-amber-400">{{ displayPrice | number:'1.2-2' }}</span>
                  <span class="text-sm font-bold text-amber-400 self-start mt-1">€</span>
                  <span *ngIf="hasDiscount"
                        class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                    -{{ book.discount }}%
                  </span>
                </div>
                <p *ngIf="hasDiscount" class="text-slate-400 text-sm mt-1 line-through">
                  {{ originalPrice | number:'1.2-2' }} €
                </p>
              </div>

              <!-- Description -->
              <p class="text-slate-300 text-sm leading-relaxed mb-6 max-w-xl">
                {{ book.description || t('bookDetails.unknownDescription') }}
              </p>

              <!-- Actions -->
              <div class="flex gap-3 flex-wrap">
                <button (click)="addToCart()"
                        class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-8 py-3 rounded-xl transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-amber-500/25">
                  <span class="material-symbols-outlined">shopping_cart</span>
                  {{ t('bookDetails.addToCart') }}
                </button>
                <button (click)="toggleWishlist()"
                        class="border border-white/20 hover:border-white/40 text-white px-5 py-3 rounded-xl transition-colors hover:bg-white/5 flex items-center gap-2">
                  <span class="material-symbols-outlined" [class.text-red-400]="isInWishlist">
                    {{ isInWishlist ? 'favorite' : 'favorite_border' }}
                  </span>
                  {{ isInWishlist ? t('bookDetails.removeFromWishlist') : t('bookDetails.addToWishlist') }}
                </button>
              </div>
            </div>
          </div>

          <!-- AI Summary -->
          <div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 mb-10">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-symbols-outlined text-amber-400">smart_toy</span>
              <h2 class="font-bold text-amber-400">{{ t('bookDetails.aiSummaryTitle') }}</h2>
              <button *ngIf="!aiSummary && !aiLoading && isLoggedIn"
                      (click)="loadAiSummary()"
                      class="ml-auto text-xs bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 px-3 py-1 rounded-full transition-colors">
                {{ t('bookDetails.generate') }}
              </button>
            </div>
            <div *ngIf="!isLoggedIn" class="text-slate-400 text-sm">
              <a routerLink="/login" class="text-amber-400 underline">{{ t('bookDetails.loginToSummary') }}</a> {{ t('bookDetails.loginToSummaryMessage') }}
            </div>
            <div *ngIf="aiLoading" class="flex items-center gap-2 text-slate-400 text-sm">
              <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              {{ t('bookDetails.generatingSummary') }}
            </div>
            <p *ngIf="aiSummary" class="text-slate-300 text-sm leading-relaxed">{{ aiSummary }}</p>
            <p *ngIf="!aiSummary && !aiLoading && isLoggedIn" class="text-slate-500 text-sm">
              {{ t('bookDetails.clickGenerate') }}
            </p>
          </div>

          <!-- Reviews -->
          <div class="mb-10">
            <h2 class="text-xl font-bold mb-6">{{ t('bookDetails.reviewsTitle') }} ({{ reviews.length }})</h2>

            <!-- Add review -->
            <div *ngIf="isLoggedIn" class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h3 class="font-semibold mb-4">{{ t('bookDetails.giveReview') }}</h3>

              <!-- Star picker -->
              <div class="flex gap-1 mb-4">
                <button *ngFor="let i of [1,2,3,4,5]"
                        (click)="newReview.rating = i"
                        class="text-2xl transition-colors leading-none bg-transparent border-0 p-0 cursor-pointer"
                        [class.text-amber-400]="i <= newReview.rating"
                        [class.text-slate-600]="i > newReview.rating">
                  <span class="material-symbols-outlined"
                        [class.star-filled]="i <= newReview.rating">star</span>
                </button>
              </div>

              <textarea [(ngModel)]="newReview.comment"
                        [placeholder]="t('bookDetails.reviewPlaceholder')"
                        rows="3"
                        class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors text-sm resize-none mb-3">
              </textarea>

              <button (click)="submitReview()"
                      [disabled]="!newReview.comment.trim() || newReview.rating === 0 || reviewLoading"
                      class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <span *ngIf="reviewLoading" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                {{ t('bookDetails.publishReview') }}
              </button>
            </div>

            <div *ngIf="!isLoggedIn" class="text-slate-400 text-sm mb-6">
              <a routerLink="/login" class="text-amber-400 underline">{{ t('bookDetails.loginToReview') }}</a> {{ t('bookDetails.loginToReviewMessage') }}
            </div>

            <!-- Reviews list -->
            <div *ngIf="reviews.length === 0" class="text-center text-slate-500 py-8">
              <span class="material-symbols-outlined text-4xl block mb-2 text-slate-600">rate_review</span>
              {{ t('bookDetails.noReviews') }}
            </div>

            <div *ngFor="let r of reviews"
                 class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-amber-400 text-sm">person</span>
                  </div>
                  <span class="font-semibold text-sm">{{ r.user?.username || t('bookDetails.anonymous') }}</span>
                </div>
                <div class="flex gap-0.5">
                  <span *ngFor="let i of [1,2,3,4,5]"
                        class="material-symbols-outlined text-sm"
                        [class.text-amber-400]="i <= r.rating"
                        [class.text-slate-600]="i > r.rating"
                        [class.star-filled]="i <= r.rating">star</span>
                </div>
              </div>
              <p class="text-slate-300 text-sm">{{ r.comment }}</p>
            </div>
          </div>

        </div>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styleUrl: './book-details.component.scss'
})
export class BookDetailsComponent implements OnInit {

  book: Book | null = null;
  reviews: BookReview[] = [];
  isLoading = true;
  isLoggedIn = false;
  isInWishlist = false;

  aiSummary = '';
  aiLoading = false;

  newReview = { rating: 0, comment: '' };
  reviewLoading = false;

  toastMsg = '';
  toastVisible = false;
  private toastTimer: any;

  // ✅ FIX: computed as plain numbers — no optional chaining needed in template
  get bookRating(): number {
    return Math.floor(this.book?.rating ?? 0);
  }

  get bookRatingLabel(): string {
    const r = this.book?.rating ?? 0;
    return r.toFixed(1);
  }

  get hasDiscount(): boolean {
    return !!this.book?.discount && this.book.discount > 0;
  }

  get displayPrice(): number {
    if (!this.book) return 0;
    if (!this.hasDiscount) return this.book.price;
    return this.book.price * (1 - (this.book.discount ?? 0) / 100);
  }

  get originalPrice(): number {
    return this.book?.price ?? 0;
  }

  constructor(
      private route: ActivatedRoute,
      private router: Router,
      private bookService: BookService,
      private cartService: CartService,
      private chatService: ChatService,
      private authService: AuthService,
      private wishlistService: WishlistService,
      private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn().subscribe(s => this.isLoggedIn = s);
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) { this.isLoading = false; return; }
      this.loadBook(id);
    });
  }

  loadBook(id: number): void {
    this.isLoading = true;
    this.bookService.getBookById(id).subscribe({
      next: (book) => {
        this.book = { ...book, coverImageUrl: book.imageUrl };
        this.isInWishlist = this.wishlistService.getIdsSnapshot().includes(book.id);
        this.isLoading = false;
        this.loadReviews(id);
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadReviews(bookId: number): void {
    this.bookService.getReviews(bookId).subscribe({
      next: (reviews) => this.reviews = reviews,
      error: () => {}
    });
  }

  loadAiSummary(): void {
    if (!this.book) return;
    this.aiLoading = true;
    this.chatService.getBookSummary(this.book.id).subscribe({
      next: (summary) => { this.aiSummary = summary; this.aiLoading = false; },
      error: () => { this.aiSummary = this.t('bookDetails.summaryError'); this.aiLoading = false; }
    });
  }

  addToCart(): void {
    if (!this.book) return;
    this.cartService.addToCart(this.book);
    this.showToast(`"${this.book.title}" ${this.t('bookDetails.addToCart')} !`);
  }

  toggleWishlist(): void {
    if (!this.book) return;
    this.wishlistService.toggle(this.book);
    this.isInWishlist = this.wishlistService.getIdsSnapshot().includes(this.book.id);
    this.showToast(this.isInWishlist ? this.t('bookDetails.addedToWishlist') : this.t('bookDetails.removeFromWishlist'));
  }

  submitReview(): void {
    if (!this.book || !this.newReview.comment.trim() || this.newReview.rating === 0) return;
    this.reviewLoading = true;
    this.bookService.addReview(this.book.id, {
      rating: this.newReview.rating,
      comment: this.newReview.comment
    }).subscribe({
      next: (review) => {
        this.reviews.unshift(review);
        // Recalculer la note moyenne localement
        if (this.book) {
          const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
          this.book.rating = Math.round((total / this.reviews.length) * 10) / 10;
        }
        this.newReview = { rating: 0, comment: '' };
        this.reviewLoading = false;
        this.showToast(this.t('bookDetails.reviewPublished'));
      },
      error: () => { this.reviewLoading = false; this.showToast(this.t('bookDetails.reviewError')); }
    });
  }

  translateCategory(category: string): string {
    return this.languageService.categoryLabel(category);
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3000);
  }
}