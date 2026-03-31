import { Component, OnInit } from "@angular/core";
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
  selectedSort     = 'featured';
  currentPage      = 1;
  books: Book[]    = [];
  recommendedBooks: Book[] = [];
  wishlistBookIds: number[] = [];

  // Recommandations IA
  aiRecommendations: Book[] = [];
  aiRecommendationType: 'personalized' | 'cold_start' = 'cold_start';
  aiLoading = true;

  // Filtres sidebar
  activeCategory = '';
  activePrice: PriceRange | null = null;

  get sectionTitle(): string {
    if (this.activeCategory) return this.activeCategory;
    if (this.activePrice)    return `Prix : ${this.activePrice.label}`;
    return 'Recommandés pour vous';
  }

  get isFiltered(): boolean {
    return !!(this.activeCategory || this.activePrice);
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
    private router: Router
  ) {}

  ngOnInit(): void {
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
      result = result.filter(b => b.category === this.activeCategory);
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
