import { ChangeDetectorRef, Component, HostListener, OnInit } from "@angular/core";
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
import { OrderService } from "../../../core/services/order.service";
import { Router } from "@angular/router";
import { Order } from "../../../shared/models/order.model";

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
  readonly pageSize = 14;

  selectedSort     = 'featured';
  currentPage      = 1;
  books: Book[]    = [];
  recommendedBooks: Book[] = [];
  recommendationBaseBooks: Book[] = [];
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
    return this.t('home.reco.purchaseBased');
  }

  get isFiltered(): boolean {
    return !!(this.activeCategory || this.activePrice);
  }

  get booksFoundLabel(): string {
    return this.t('home.booksFound').replace('{{count}}', `${this.recommendedBooks.length}`);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.recommendedBooks.length / this.pageSize));
  }

  get showPagination(): boolean {
    return this.recommendedBooks.length > this.pageSize;
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
    private orderService: OrderService,
    private authService: AuthService,
    private languageService: LanguageService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.currentLanguage;
    this.isLoggedIn = this.authService.isLoggedInSnapshot();
    this.username = this.authService.getUsername() ?? '';

    this.authService.isLoggedIn().subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      this.username = isLoggedIn ? (this.authService.getUsername() ?? '') : '';
      this.refreshPurchaseBasedRecommendations();
      this.cdr.detectChanges();
    });

    this.languageService.currentLanguageChanges().subscribe(lang => {
      this.currentLang = lang;
      this.cdr.detectChanges();
    });

    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.books = books.map(b => ({
          ...b,
          coverImageUrl: b.imageUrl,
          authors: b.author ? b.author.map((name, i) => ({ id: String(i), name })) : [],
          reviewCount: b.reviewCount ?? 0,
          inStock: (b.quantity ?? 0) > 0 && (b.status ?? 'ACTIVE') !== 'OUT_OF_STOCK' && (b.status ?? 'ACTIVE') !== 'DISCONTINUED'
        }));
        this.recommendationBaseBooks = [...this.books];
        this.applyFilters();
        this.refreshPurchaseBasedRecommendations();

        const localAvg = this.computeAverageRatingFromBooks(this.books);
        this.bookService.getAverageReviewRating().subscribe({
          next: (avg) => {
            this.averageReviewRating = Number.isFinite(avg) && avg > 0 ? avg : localAvg;
          },
          error: () => {
            this.averageReviewRating = localAvg;
            this.cdr.detectChanges();
          }
        });
        this.cdr.detectChanges();
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
          inStock: (b.quantity ?? 0) > 0 && (b.status ?? 'ACTIVE') !== 'OUT_OF_STOCK' && (b.status ?? 'ACTIVE') !== 'DISCONTINUED'
        }));
        this.aiRecommendationType = result.type;
        this.aiLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiLoading = false;
        this.cdr.detectChanges();
      }
    });

  }

  private computeAverageRatingFromBooks(books: Book[]): number {
    let weightedSum = 0;
    let totalReviews = 0;

    for (const b of books) {
      const rating = b.rating ?? 0;
      const count = b.reviewCount ?? 0;

      if (rating >= 1 && rating <= 5 && count > 0) {
        weightedSum += rating * count;
        totalReviews += count;
      }
    }

    if (totalReviews === 0) return 0;
    return weightedSum / totalReviews;
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
    let result = [...this.recommendationBaseBooks];

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
        if (!this.isFiltered) this.recommendedBooks = [...this.recommendationBaseBooks];
        break;
    }
  }

  private refreshPurchaseBasedRecommendations(): void {
    if (this.books.length === 0) {
      return;
    }

    if (!this.isLoggedIn) {
      this.recommendationBaseBooks = [...this.books];
      this.applyFilters();
      return;
    }

    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.recommendationBaseBooks = this.computePurchaseBasedBooks(orders);
        this.applyFilters();
      },
      error: () => {
        this.recommendationBaseBooks = [...this.books];
        this.applyFilters();
      }
    });
  }

  private computePurchaseBasedBooks(orders: Order[]): Book[] {
    const purchasedIds = new Set<number>();
    const authorWeights = new Map<string, number>();
    const categoryWeights = new Map<string, number>();

    for (const order of orders) {
      for (const item of order.items ?? []) {
        const purchasedBook = item.book;
        if (!purchasedBook) {
          continue;
        }

        purchasedIds.add(purchasedBook.id);
        const qty = Math.max(1, item.quantity ?? 1);

        for (const rawAuthor of purchasedBook.author ?? []) {
          const author = (rawAuthor ?? '').trim().toLowerCase();
          if (!author) {
            continue;
          }
          authorWeights.set(author, (authorWeights.get(author) ?? 0) + qty);
        }

        const category = (purchasedBook.category ?? '').trim().toLowerCase();
        if (category) {
          categoryWeights.set(category, (categoryWeights.get(category) ?? 0) + qty);
        }
      }
    }

    if (purchasedIds.size === 0) {
      return [...this.books];
    }

    const candidates = this.books.filter(book => !purchasedIds.has(book.id));

    const scored = candidates
      .map(book => ({
        book,
        score: this.getPurchaseAffinityScore(book, authorWeights, categoryWeights)
      }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (b.book.rating ?? 0) - (a.book.rating ?? 0);
      })
      .map(entry => entry.book);

    if (scored.length > 0) {
      return scored;
    }

    return candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  private getPurchaseAffinityScore(
    book: Book,
    authorWeights: Map<string, number>,
    categoryWeights: Map<string, number>
  ): number {
    let score = 0;

    for (const rawAuthor of book.author ?? []) {
      const author = (rawAuthor ?? '').trim().toLowerCase();
      if (author && authorWeights.has(author)) {
        score += (authorWeights.get(author) ?? 0) * 4;
      }
    }

    const category = (book.category ?? '').trim().toLowerCase();
    if (category && categoryWeights.has(category)) {
      score += (categoryWeights.get(category) ?? 0) * 2;
    }

    return score;
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
