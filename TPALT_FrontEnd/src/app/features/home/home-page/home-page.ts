import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Navbar } from "../../../layout/navbar/navbar";
import { Footer } from "../../../layout/footer/footer";
import { SidebarFilters } from "../../../layout/sidebar-filters/sidebar-filters";
import { Pagination } from "../../../shared/pagination/pagination";
import { BookGridComponent } from "../../../shared/components";
import { Book } from "../../../shared/models";
import { BookService } from "../../../core/services/book.service";
import { CartService } from "../../../core/services/cart.service";
import { WishlistService } from "../../../core/services/wishlist.service";
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
  selectedSort = 'featured';
  currentPage = 1;
  books: Book[] = [];
  recommendedBooks: Book[] = [];
  wishlistBookIds: number[] = [];

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
  }

  onSortChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedSort = selectElement.value;
    this.sortBooks();
  }

  private sortBooks(): void {
    switch (this.selectedSort) {
      case 'price-asc':
        this.recommendedBooks.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        this.recommendedBooks.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.recommendedBooks.sort((a, b) => b.rating - a.rating);
        break;
      default:
        this.recommendedBooks = [...this.books];
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
