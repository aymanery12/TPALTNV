import { Component, HostListener, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Navbar } from "../../../layout/navbar/navbar";
import { Footer } from "../../../layout/footer/footer";
import { SidebarFilters, PriceRange } from "../../../layout/sidebar-filters/sidebar-filters";
import { Pagination } from "../../../shared/pagination/pagination";
import { BookGridComponent } from "../../../shared/components";
import { Book } from "../../../shared/models";
import { BookService } from "../../../core/services/book.service";
import { CartService } from "../../../core/services/cart.service";
import { WishlistService } from "../../../core/services/wishlist.service";
import { RecommendationService } from "../../../core/services/recommendation.service";
import { AuthService } from "../../../core/services/auth.service";
import { LanguageService } from "../../../core/services/language.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-home-page",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Navbar,
    Footer,
    SidebarFilters,
    BookGridComponent,
    Pagination
  ],
  templateUrl: "./home-page.html",
  styleUrl: "./home-page.scss",
})
export class HomePage implements OnInit {
  readonly offersCategoryValue = '__offers__';

  selectedSort     = 'featured';
  currentPage      = 1;
  books: Book[]    = [];
  recommendedBooks: Book[] = [];
  wishlistBookIds: number[] = [];

  // Recommandations IA
  aiRecommendations: Book[] = [];
  aiRecommendationType: 'personalized' | 'cold_start' = 'cold_start';
  aiLoading = true;

  averageReviewRating = 0;
  isLoggedIn = false;
  username = '';
  currentLang: 'fr' | 'en' = 'fr';

  // Filtres sidebar
  activeCategory = '';
  activePrice: PriceRange | null = null;
  sortMenuOpen = false;

  get sectionTitle(): string {
    if (this.activeCategory) {
      return this.languageService.categoryLabel(this.activeCategory);
    }
    if (this.activePrice)    return `${this.t('home.pricePrefix')} ${this.t(this.activePrice.label)}`;
    return this.t('home.reco.personalized');
  }

  get isFiltered(): boolean {
    return !!(this.activeCategory || this.activePrice);
  }

  get booksFoundLabel(): string {
    return this.t('home.booksFound').replace('{{count}}', `${this.recommendedBooks.length}`);
  }

  get booksAvailableLabel(): string {
    const count = this.books.length;

    if (count === 1) {
      return '1';
    }

    if (count < 100) {
      return `${count}`;
    }

    const bucket = Math.floor(count / 100) * 100;
    return `${bucket}+ `;
  }

  get wishlistIds(): number[] {
    return this.wishlistService.getIdsSnapshot();
  }

  // Toast notification state
  toastMessage = '';
  toastVisible = false;
  private toastTimer: any;

  constructor(
    private bookService: BookService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private recommendationService: RecommendationService,
    private authService: AuthService,
    private languageService: LanguageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.currentLanguage;
    this.isLoggedIn = this.authService.isLoggedInSnapshot();
    this.username = this.authService.getUsername() ?? '';

    this.authService.isLoggedIn().subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      this.username = isLoggedIn ? (this.authService.getUsername() ?? '') : '';
    });

    this.languageService.currentLanguageChanges().subscribe(lang => {
      this.currentLang = lang;
    });

    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.books = books.map(b => ({
          ...b,
          coverImageUrl: b.imageUrl,
          authors: b.author ? b.author.map((name, i) => ({ id: String(i), name })) : [],
          reviewCount: 0,
          inStock: true
        }));
        this.recommendedBooks = [...this.books];
      },
      error: (err) => console.error('Erreur chargement livres:', err)
    });

    this.recommendationService.getRecommendations().subscribe({
      next: (result) => {
        this.aiRecommendations   = result.books.map(b => ({
          ...b,
          coverImageUrl: b.imageUrl,
          authors: b.author ? b.author.map((name, i) => ({ id: String(i), name })) : [],
          reviewCount: b.reviewCount ?? 0,
          inStock: true
        }));
        this.aiRecommendationType = result.type;
        this.aiLoading = false;
      },
      error: () => { this.aiLoading = false; }
    });

    this.bookService.getAverageReviewRating().subscribe({
      next: (avg) => this.averageReviewRating = avg,
      error: () => { this.averageReviewRating = 0; }
    });
  }

  onCategorySelected(cat: string): void {
    this.activeCategory = cat;
    this.activePrice    = null;
    this.applyFilters();
  }

  onPriceSelected(range: PriceRange): void {
    this.activePrice    = range.label ? range : null;
    this.activeCategory = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.activeCategory = '';
    this.activePrice    = null;
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.books];

    if (this.activeCategory) {
      if (this.activeCategory === this.offersCategoryValue) {
        result = result.filter(b => (b.discount ?? 0) > 0);
      } else {
        result = result.filter(b => b.category === this.activeCategory);
      }
    }
    if (this.activePrice) {
      if (this.activePrice.min !== undefined) result = result.filter(b => b.price >= this.activePrice!.min!);
      if (this.activePrice.max !== undefined) result = result.filter(b => b.price <= this.activePrice!.max!);
    }

    this.recommendedBooks = result;
    this.sortBooks();
  }

  onSortChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedSort = selectElement.value;
    this.sortBooks();
  }

  toggleSortMenu(): void {
    this.sortMenuOpen = !this.sortMenuOpen;
  }

  selectSort(sort: string): void {
    this.selectedSort = sort;
    this.sortBooks();
    this.sortMenuOpen = false;
  }

  @HostListener('document:click')
  closeSortMenu(): void {
    this.sortMenuOpen = false;
  }

  private sortBooks(): void {
    switch (this.selectedSort) {
      case 'price-asc':  this.recommendedBooks.sort((a, b) => a.price - b.price); break;
      case 'price-desc': this.recommendedBooks.sort((a, b) => b.price - a.price); break;
      case 'rating':     this.recommendedBooks.sort((a, b) => b.rating - a.rating); break;
      default:
        if (!this.isFiltered) this.recommendedBooks = [...this.books];
        break;
    }
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

  hasDiscount(book: Book): boolean {
    return (book.discount ?? 0) > 0;
  }

  getDisplayPrice(book: Book): number {
    const discount = book.discount ?? 0;
    return discount > 0 ? (book.price ?? 0) * (1 - discount / 100) : (book.price ?? 0);
  }

  get averageReviewLabel(): string {
    return `${this.averageReviewRating.toFixed(1)} ★`;
  }

  get greetingLabel(): string {
    return this.isLoggedIn && this.username ? `${this.t('navbar.guestGreeting')} ${this.username}` : '';
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  translateSort(sort: string): string {
    return this.languageService.sortLabel(sort);
  }

  scrollToBooks(): void {
    document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3000);
  }
}
