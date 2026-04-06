import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../../core/services/book.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { Subscription } from 'rxjs';
import { Book } from '../../../shared/models/book.model';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { BookGridComponent } from '../../../shared/components/book-grid/book-grid';
import { Pagination } from '../../../shared/pagination/pagination';
import { LanguageService } from '../../../core/services/language.service';
import { isCategoryEqual, getUniqueCategoriesFromBooks } from '../../../shared/utils/category-utils';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Navbar, Footer, BookGridComponent, Pagination],
  template: `
    <div class="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      <app-navbar></app-navbar>

      <!-- Toast -->
      <div *ngIf="toastVisible"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">check_circle</span>{{ toastMsg }}
      </div>

      <main class="flex-1 max-w-[1440px] mx-auto w-full p-4 pt-14 md:p-8 md:pt-20">

        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-white">
            {{ searchQuery ? t('catalog.searchResults').replace('{{query}}', searchQuery) : t('catalog.title') }}
          </h1>
          <p class="text-slate-400 text-sm mt-1">{{ t('catalog.booksFound').replace('{{count}}', filteredBooks.length.toString()) }}</p>
        </div>

        <!-- Search + Sort bar -->
        <div class="flex flex-col md:flex-row gap-3 mb-8">

          <!-- Search input -->
          <div class="relative flex-1">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              [placeholder]="t('navbar.searchPlaceholder')"
              class="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors text-sm">
          </div>

          <!-- Category filter -->
          <div class="relative min-w-[160px]" (click)="$event.stopPropagation()">
            <button
              type="button"
              class="w-full bg-slate-900/70 border border-amber-400/30 text-white rounded-xl pl-3 pr-10 py-3 text-sm focus:outline-none focus:border-amber-400 hover:border-amber-400/60 transition-colors text-left"
              (click)="toggleCategoryMenu()">
              {{ selectedCategoryLabel }}
              <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-amber-300 text-lg pointer-events-none">expand_more</span>
            </button>

            <div *ngIf="categoryMenuOpen"
                class="absolute left-0 mt-2 w-full rounded-xl border border-amber-400/30 bg-[#121a33] shadow-xl overflow-hidden z-30 max-h-72 overflow-y-auto">
              <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                      [class.bg-amber-400/25]="selectedCategory === ''"
                      [class.text-amber-300]="selectedCategory === ''"
                      (click)="selectCategory('')">{{ t('catalog.allCategories') }}</button>
              <button type="button" class="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                      [class.bg-amber-400/25]="selectedCategory === offersCategoryValue"
                      [class.text-amber-300]="selectedCategory === offersCategoryValue"
                      (click)="selectCategory(offersCategoryValue)">{{ t('catalog.onSale') }}</button>
              <button *ngFor="let cat of categories"
                      type="button"
                      class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                      [class.bg-amber-400/25]="selectedCategory === cat"
                      [class.text-amber-300]="selectedCategory === cat"
                      (click)="selectCategory(cat)">{{ translateCategory(cat) }}</button>
            </div>
          </div>

            <!-- Sort -->
            <div class="relative min-w-[160px]" (click)="$event.stopPropagation()">
              <button
                type="button"
                class="w-full bg-slate-900/70 border border-amber-400/30 text-white rounded-xl pl-3 pr-10 py-3 text-sm focus:outline-none focus:border-amber-400 hover:border-amber-400/60 transition-colors text-left"
                (click)="toggleSortMenu()">
                {{ translateSort(selectedSort) }}
                <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-amber-300 text-lg pointer-events-none">expand_more</span>
              </button>

              <div *ngIf="sortMenuOpen"
               class="absolute left-0 mt-2 w-full rounded-xl border border-amber-400/30 bg-[#121a33] shadow-xl overflow-hidden z-30">
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                  [class.bg-amber-400/25]="selectedSort === 'featured'"
                  [class.text-amber-300]="selectedSort === 'featured'"
                  (click)="selectSort('featured')">{{ t('sort.featured') }}</button>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                  [class.bg-amber-400/25]="selectedSort === 'price-asc'"
                  [class.text-amber-300]="selectedSort === 'price-asc'"
                  (click)="selectSort('price-asc')">{{ t('sort.priceAsc') }}</button>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                  [class.bg-amber-400/25]="selectedSort === 'price-desc'"
                  [class.text-amber-300]="selectedSort === 'price-desc'"
                  (click)="selectSort('price-desc')">{{ t('sort.priceDesc') }}</button>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                  [class.bg-amber-400/25]="selectedSort === 'rating'"
                  [class.text-amber-300]="selectedSort === 'rating'"
                  (click)="selectSort('rating')">{{ t('sort.rating') }}</button>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-amber-400/20 hover:text-amber-300 transition-colors"
                  [class.bg-amber-400/25]="selectedSort === 'title'"
                  [class.text-amber-300]="selectedSort === 'title'"
                  (click)="selectSort('title')">{{ t('sort.title') }}</button>
              </div>
          </div>
        </div>

        <!-- No results -->
        <div *ngIf="!isLoading && filteredBooks.length === 0"
             class="flex flex-col items-center justify-center py-24 text-slate-400">
          <span class="material-symbols-outlined text-6xl mb-4 text-slate-600">search_off</span>
          <p class="text-lg font-medium">{{ t('catalog.noBooks') }}</p>
          <p class="text-sm mt-1">{{ t('catalog.noBooksHint') }}</p>
          <button (click)="clearFilters()"
                  class="mt-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-2 rounded-xl transition-colors">
            {{ t('catalog.reset') }}
          </button>
        </div>

        <!-- Book Grid -->
        <app-book-grid
          *ngIf="!isLoading && filteredBooks.length > 0"
          [books]="pagedBooks"
          [wishlistBookIds]="wishlistIds"
          (bookSelected)="onBookSelected($event)"
          (addToCart)="onAddToCart($event)"
          (wishlistToggled)="onWishlistToggled($event)">
        </app-book-grid>

        <!-- Pagination -->
        <div *ngIf="totalPages > 1" class="mt-10 flex justify-center">
          <app-pagination
            [currentPage]="currentPage"
            [totalPages]="totalPages"
            (pageChange)="onPageChange($event)">
          </app-pagination>
        </div>

      </main>
      <app-footer></app-footer>
    </div>
  `,
  styleUrl: './book-list.scss'
})
export class BookList implements OnInit, OnDestroy {

  readonly offersCategoryValue = '__offers__';

  allBooks: Book[] = [];
  filteredBooks: Book[] = [];
  pagedBooks: Book[] = [];
  categories: string[] = [];
  wishlistIds: number[] = [];

  searchQuery = '';
  selectedCategory = '';
  selectedSort = 'featured';
  categoryMenuOpen = false;
  sortMenuOpen = false;
  currentLang: 'fr' | 'en' = 'fr';
  minRating = 0;
  minPrice = 0;
  maxPrice = 0;

  isLoading = true;
  currentPage = 1;
  readonly pageSize = 20;
  totalPages = 1;

  toastMsg = '';
  toastVisible = false;
  private toastTimer: any;
  private wishlistSub?: Subscription;
  private readonly closeMenusOnCaptureClick = (): void => {
    this.categoryMenuOpen = false;
    this.sortMenuOpen = false;
  };

  constructor(
      private bookService: BookService,
      private cartService: CartService,
      private wishlistService: WishlistService,
      private languageService: LanguageService,
      private route: ActivatedRoute,
      private router: Router,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    document.addEventListener('click', this.closeMenusOnCaptureClick, true);

    this.wishlistSub = this.wishlistService.getIds().subscribe(ids => {
      this.wishlistIds = ids;
    });

    this.currentLang = this.languageService.currentLanguage;
    this.languageService.currentLanguageChanges().subscribe(lang => {
      this.currentLang = lang;
    });

    this.route.queryParams.subscribe(params => {
      // Reset all filters first so switching between buttons works correctly
      this.selectedSort     = 'featured';
      this.minRating        = 0;
      this.minPrice         = 0;
      this.maxPrice         = 0;

      this.searchQuery      = params['search']?.trim()    || '';
      this.selectedCategory = params['category']?.trim()  || '';
      if (params['sort'])      this.selectedSort = params['sort'];
      if (params['minRating']) this.minRating    = +params['minRating'];
      if (params['minPrice'])  this.minPrice     = +params['minPrice'];
      if (params['maxPrice'])  this.maxPrice     = +params['maxPrice'];
      this.loadBooks();
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeMenusOnCaptureClick, true);
    this.wishlistSub?.unsubscribe();
  }

  loadBooks(): void {
    this.isLoading = true;
    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.allBooks = books.map(b => ({
          ...b,
          coverImageUrl: b.imageUrl,
          authors: b.author ? b.author.map((name, i) => ({ id: String(i), name })) : [],
          reviewCount: b.reviewCount ?? 0,
          inStock: (b.quantity ?? 0) > 0 && (b.status ?? 'ACTIVE') !== 'OUT_OF_STOCK' && (b.status ?? 'ACTIVE') !== 'DISCONTINUED'
        }));

        // Extraire les catégories uniques
        this.categories = getUniqueCategoriesFromBooks(this.allBooks).sort();

        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    // Mettre à jour l'URL sans recharger
    this.router.navigate([], {
      queryParams: this.searchQuery ? { search: this.searchQuery } : {},
      replaceUrl: true
    });
  }

  applyFilters(): void {
    let result = [...this.allBooks];

    // Filtre recherche
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b =>
          b.title?.toLowerCase().includes(q) ||
          b.author?.some(a => a.toLowerCase().includes(q)) ||
          b.category?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    // Filtre catégorie
    if (this.selectedCategory) {
      if (this.selectedCategory === this.offersCategoryValue) {
        result = result.filter(b => (b.discount ?? 0) > 0);
      } else {
        result = result.filter(b => isCategoryEqual(b.category, this.selectedCategory));
      }
    }

    // Filtre note minimale
    if (this.minRating > 0) {
      result = result.filter(b => (b.rating || 0) >= this.minRating);
    }

    // Filtre prix
    if (this.minPrice > 0) {
      result = result.filter(b => b.price >= this.minPrice);
    }
    if (this.maxPrice > 0) {
      result = result.filter(b => b.price <= this.maxPrice);
    }

    // Tri
    switch (this.selectedSort) {
      case 'price-asc':  result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating':     result.sort((a, b) => b.rating - a.rating); break;
      case 'title':      result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'newest':     result.sort((a, b) => b.id - a.id); break;
    }

    this.filteredBooks = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedBooks = this.filteredBooks.slice(start, start + this.pageSize);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedSort = 'featured';
    this.minRating = 0;
    this.minPrice = 0;
    this.maxPrice = 0;
    this.currentPage = 1;
    this.applyFilters();
    this.router.navigate([], { replaceUrl: true });
  }

  toggleSortMenu(): void {
    this.sortMenuOpen = !this.sortMenuOpen;
    if (this.sortMenuOpen) this.categoryMenuOpen = false;
  }

  toggleCategoryMenu(): void {
    this.categoryMenuOpen = !this.categoryMenuOpen;
    if (this.categoryMenuOpen) this.sortMenuOpen = false;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.applyFilters();
    this.categoryMenuOpen = false;
  }

  selectSort(sort: string): void {
    this.selectedSort = sort;
    this.currentPage = 1;
    this.applyFilters();
    this.sortMenuOpen = false;
  }

  get selectedCategoryLabel(): string {
    if (!this.selectedCategory) {
      return this.t('catalog.allCategories');
    }
    if (this.selectedCategory === this.offersCategoryValue) {
      return this.t('catalog.onSale');
    }
    return this.translateCategory(this.selectedCategory);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onBookSelected(book: Book): void {
    this.router.navigate(['/books', book.id]);
  }

  onAddToCart(book: Book): void {
    const result = this.cartService.addToCart(book);
    if (!result.added) {
      if (result.reason === 'OUT_OF_STOCK') {
        this.showToast(this.t('bookCard.soldOut'));
      } else {
        this.showToast(this.t('cart.stockLimitError').replace('{{count}}', String(result.maxAvailable ?? 0)));
      }
      return;
    }
    this.showToast(`"${book.title}" ajouté au panier !`);
  }

  onWishlistToggled(book: Book): void {
    this.wishlistService.toggle(book);
  }

  translateCategory(cat: string): string {
    return this.languageService.categoryLabel(cat);
  }

  translateSort(sort: string): string {
    return this.languageService.sortLabel(sort);
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