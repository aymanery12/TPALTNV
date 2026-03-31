import { Component, OnInit, OnDestroy } from '@angular/core';
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

      <main class="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8">

        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-white">
            {{ searchQuery ? 'Résultats pour "' + searchQuery + '"' : 'Catalogue' }}
          </h1>
          <p class="text-slate-400 text-sm mt-1">{{ filteredBooks.length }} livre(s) trouvé(s)</p>
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
              placeholder="Rechercher un titre, auteur..."
              class="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors text-sm">
          </div>

          <!-- Category filter -->
          <select [(ngModel)]="selectedCategory" (ngModelChange)="applyFilters()"
                  class="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 cursor-pointer min-w-[160px]">
            <option value="" class="bg-slate-800">Toutes catégories</option>
            <option *ngFor="let cat of categories" [value]="cat" class="bg-slate-800">{{ cat }}</option>
          </select>

          <!-- Sort -->
          <select [(ngModel)]="selectedSort" (ngModelChange)="applyFilters()"
                  class="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 cursor-pointer min-w-[160px]">
            <option value="featured"   class="bg-slate-800">En vedette</option>
            <option value="price-asc"  class="bg-slate-800">Prix croissant</option>
            <option value="price-desc" class="bg-slate-800">Prix décroissant</option>
            <option value="rating"     class="bg-slate-800">Mieux notés</option>
            <option value="title"      class="bg-slate-800">Titre A-Z</option>
          </select>
        </div>

        <!-- No results -->
        <div *ngIf="!isLoading && filteredBooks.length === 0"
             class="flex flex-col items-center justify-center py-24 text-slate-400">
          <span class="material-symbols-outlined text-6xl mb-4 text-slate-600">search_off</span>
          <p class="text-lg font-medium">Aucun livre trouvé</p>
          <p class="text-sm mt-1">Essayez un autre mot-clé ou une autre catégorie</p>
          <button (click)="clearFilters()"
                  class="mt-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-2 rounded-xl transition-colors">
            Réinitialiser
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

  allBooks: Book[] = [];
  filteredBooks: Book[] = [];
  pagedBooks: Book[] = [];
  categories: string[] = [];
  wishlistIds: number[] = [];

  searchQuery = '';
  selectedCategory = '';
  selectedSort = 'featured';
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

  constructor(
      private bookService: BookService,
      private cartService: CartService,
      private wishlistService: WishlistService,
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.wishlistSub = this.wishlistService.getIds().subscribe(ids => {
      this.wishlistIds = ids;
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
          reviewCount: 0,
          inStock: true
        }));

        // Extraire les catégories uniques
        this.categories = [...new Set(this.allBooks.map(b => b.category).filter(Boolean))].sort();

        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
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
      result = result.filter(b => b.category === this.selectedCategory);
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

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onBookSelected(book: Book): void {
    this.router.navigate(['/books', book.id]);
  }

  onAddToCart(book: Book): void {
    this.cartService.addToCart(book);
    this.showToast(`"${book.title}" ajouté au panier !`);
  }

  onWishlistToggled(book: Book): void {
    this.wishlistService.toggle(book);
  }

  private showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3000);
  }
}