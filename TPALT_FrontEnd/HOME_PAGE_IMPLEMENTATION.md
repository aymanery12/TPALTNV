# Home Page Component Implementation Guide

## Overview

Your home page is now built with **fully modularized, reusable components**. Each component is designed to be extended with functionality while maintaining clean separation of concerns.

## Components Structure

```
HomePage (Main Component)
├── Navbar (layout)
├── CategoryNav (layout)
├── SidebarFilters (layout)
├── HeroPromo (new - shared)
├── BookGrid (new - shared)
│   └── BookCard (new - shared) [×6 books]
│       └── Rating (new - shared)
└── Pagination (shared)
└── Footer (layout)
```

## Component Anatomy & How to Add Functionality

### 1. **RatingComponent** 
**Location**: `src/app/shared/components/rating/`

**Purpose**: Displays star ratings and allows interactive rating.

**Current Features**:
- Display 5-star rating (full, half, empty)
- Show review count
- Hover effects
- Click-to-rate capability (interactive mode)

**How to Add Functionality**:

```typescript
// In parent component (BookCard or ReviewCard)
import { RatingComponent } from '@shared/components/rating/rating';

// Usage in template:
<app-rating 
  [rating]="book.rating"              // Current rating
  [reviewCount]="book.reviewCount"    // Number of reviews
  [showCount]="true"                  // Show review count badge
  [interactive]="false"               // Allow user to rate
  (ratingChanged)="onUserRated($event)">  // Emit when user rates
</app-rating>

// In component class:
onUserRated(stars: number): void {
  // Call user service to save rating
  // this.userService.rateBook(this.bookId, stars);
}
```

**TODO List in Component**:
- [ ] Add `@Output() ratingChanged` event
- [ ] Implement rating save via API
- [ ] Add loading state while saving
- [ ] Show confirmation toast

---

### 2. **BookCardComponent**
**Location**: `src/app/shared/components/book-card/`

**Purpose**: Display individual book with all details and action buttons.

**Current Features**:
- Book cover image
- Title and author(s)
- Rating with review count
- Price display with discount support
- Delivery info
- Add to Cart button
- Wishlist toggle
- Best seller/Sale badge

**How to Add Functionality**:

```typescript
// Component Usage Example
import { BookCardComponent } from '@shared/components/book-card/book-card';

// In HomePage or CatalogPage:
<app-book-card
  [book]="book"                          // Book object
  [badge]="'BEST SELLER' | 'SAVE 20%'"  // Display badge
  [isInWishlist]="false"                // Wishlist state
  (bookClicked)="navigateToDetails($event)"
  (addToCartClicked)="addBookToCart($event)"
  (wishlistToggled)="toggleWishlist($event)">
</app-book-card>

// In component class:
import { Router } from '@angular/router';
import { CartService, UserService } from '@core/services';

constructor(
  private router: Router,
  private cartService: CartService,
  private userService: UserService
) {}

// Navigate to detail page
navigateToDetails(book: Book): void {
  this.router.navigate(['/books', book.id]);
}

// Add to cart
addBookToCart(book: Book): void {
  this.cartService.addToCart(book, 1);
  // Show success toast: "Added to cart!"
}

// Toggle wishlist
toggleWishlist(book: Book): void {
  this.userService.toggleWishlist(book.id).subscribe(
    success => console.log('Wishlist updated')
  );
}
```

**TODO List in Component**:
- [ ] Implement `bookClicked` navigation to `/books/:id`
- [ ] Implement `addToCartClicked` service call
- [ ] Implement `wishlistToggled` service call
- [ ] Add toast notifications for user feedback
- [ ] Handle loading states
- [ ] Add hover animations for buttons
- [ ] Replace random delivery messages with real data

---

### 3. **BookGridComponent**
**Location**: `src/app/shared/components/book-grid/`

**Purpose**: Display grid of books with responsive layout and event propagation.

**Current Features**:
- Responsive grid (2-5 columns based on screen)
- Book card rendering
- Event bubbling to parent
- Badge logic (bestseller, discount)
- Wishlist state management

**How to Add Functionality**:

```typescript
// In HomePage:
import { BookGridComponent } from '@shared/components';

export class HomePage {
  books: Book[] = [];
  wishlistBookIds: string[] = [];

  constructor(
    private bookService: BookService,
    private cartService: CartService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Load books from service
    this.bookService.getBooks().subscribe(books => {
      this.books = books;
    });

    // Load wishlist
    this.userService.getWishlist().subscribe(wishlist => {
      this.wishlistBookIds = wishlist.bookIds;
    });
  }
}

// Template:
<app-book-grid
  [books]="books"
  [wishlistBookIds]="wishlistBookIds"
  (bookSelected)="onBookSelected($event)"
  (addToCart)="onAddToCart($event)"
  (wishlistToggled)="onWishlistToggled($event)">
</app-book-grid>

// Event handlers:
onBookSelected(book: Book): void {
  this.router.navigate(['/books', book.id]);
}

onAddToCart(book: Book): void {
  this.cartService.addToCart(book, 1).subscribe(
    success => {
      this.showToast('Added to cart!');
      this.updateCartCount();
    },
    error => this.showToast('Error adding to cart', 'error')
  );
}

onWishlistToggled(book: Book): void {
  const isAdding = !this.wishlistBookIds.includes(book.id);
  this.userService.toggleWishlist(book.id).subscribe(
    success => {
      this.showToast(
        isAdding ? 'Added to wishlist!' : 'Removed from wishlist!'
      );
      // Refresh wishlist
      this.userService.getWishlist().subscribe(w => {
        this.wishlistBookIds = w.bookIds;
      });
    }
  );
}
```

**TODO List in Component**:
- [ ] Implement loading skeletons while books fetch
- [ ] Add filtering logic
- [ ] Add search functionality
- [ ] Implement pagination
- [ ] Add error handling & retry
- [ ] Cache loaded books
- [ ] Show "no results" state

---

### 4. **HeroPromoComponent**
**Location**: `src/app/shared/components/hero-promo/`

**Purpose**: Customizable promotional banner with CTA button.

**Current Features**:
- Title, description, CTA text (all customizable)
- Gradient colors (customizable)
- Optional decorative box
- CTA click event

**How to Add Functionality**:

```typescript
// In HomePage:
<app-hero-promo
  title="Summer Reading Event"
  description="Discover this season's top-rated tech and design titles at up to 40% off."
  ctaText="Shop the Sale"
  fromColor="primary"
  toColor="blue-400"
  [showDecorativeBox]="true"
  (ctaClicked)="onPromoCTAClick()">
</app-hero-promo>

// Handle CTA click
onPromoCTAClick(): void {
  // Option 1: Navigate to filtered catalog
  this.router.navigate(['/catalog'], { 
    queryParams: { 
      onSale: true,
      discount: '>20'
    } 
  });

  // Option 2: Show filter modal
  // this.showSaleFilter();

  // Option 3: Scroll to books
  // document.querySelector('app-book-grid')?.scrollIntoView();
}
```

**TODO List in Component**:
- [ ] Make decorative box dynamic (image, icon, or custom)
- [ ] Add animation on load
- [ ] Support multiple promo types (sale, new release, featured)
- [ ] Add analytics tracking (click, impression)
- [ ] Rotation for multiple promos
- [ ] Customize button styling

---

### 5. **HomePage Component**
**Location**: `src/app/features/home/home-page/`

**Purpose**: Main page composition and orchestration.

**Current Features**:
- Layout composition
- Sample book data
- Sorting logic
- Event handling
- Wishlist state management

**How to Add Functionality**:

```typescript
export class HomePage implements OnInit {
  books: Book[] = [];
  recommendedBooks: Book[] = [];
  wishlistBookIds: string[] = [];
  selectedSort = 'featured';
  currentPage = 1;
  isLoading = false;
  error: string | null = null;

  constructor(
    private bookService: BookService,
    private cartService: CartService,
    private userService: UserService,
    private router: Router,
    private toastService: ToastService // custom service for notifications
  ) {}

  ngOnInit(): void {
    // Load initial data
    this.loadBooks();
    this.loadWishlist();
    this.loadRecommendations();
  }

  /**
   * Load books from service
   */
  private loadBooks(): void {
    this.isLoading = true;
    this.bookService.getBooks().subscribe(
      books => {
        this.books = books;
        this.recommendedBooks = [...books];
        this.isLoading = false;
      },
      error => {
        this.error = 'Failed to load books';
        this.isLoading = false;
        console.error('Book loading error:', error);
      }
    );
  }

  /**
   * Load user wishlist
   */
  private loadWishlist(): void {
    this.userService.getWishlist().subscribe(
      wishlist => {
        this.wishlistBookIds = wishlist?.bookIds || [];
      }
    );
  }

  /**
   * Load personalized recommendations
   */
  private loadRecommendations(): void {
    this.bookService.getRecommendedBooks().subscribe(
      books => {
        this.recommendedBooks = books;
      }
    );
  }

  /**
   * Sort books based on selected criteria
   */
  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSort = select.value;
    
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
      case 'featured':
      default:
        this.recommendedBooks = [...this.books];
    }
  }

  /**
   * Handle book card click - navigate to details
   */
  onBookSelected(book: Book): void {
    this.router.navigate(['/books', book.id]);
  }

  /**
   * Handle add to cart
   */
  onAddToCart(book: Book): void {
    this.cartService.addToCart(book, 1).subscribe(
      cart => {
        this.toastService.show(
          `${book.title} added to cart!`,
          'success'
        );
      },
      error => {
        this.toastService.show(
          'Failed to add to cart',
          'error'
        );
      }
    );
  }

  /**
   * Handle wishlist toggle
   */
  onWishlistToggled(book: Book): void {
    const isAdding = !this.wishlistBookIds.includes(book.id);
    
    this.userService.toggleWishlist(book.id).subscribe(
      success => {
        if (isAdding) {
          this.wishlistBookIds.push(book.id);
          this.toastService.show('Added to wishlist!', 'success');
        } else {
          this.wishlistBookIds = this.wishlistBookIds.filter(
            id => id !== book.id
          );
          this.toastService.show('Removed from wishlist', 'info');
        }
      },
      error => {
        this.toastService.show('Failed to update wishlist', 'error');
      }
    );
  }

  /**
   * Handle promo CTA click
   */
  onPromoCTAClick(): void {
    this.router.navigate(['/catalog'], {
      queryParams: {
        onSale: true,
        sortBy: 'discount'
      }
    });
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.isLoading = true;
    
    this.bookService.getBooks(page, 20).subscribe(
      books => {
        this.books = books;
        this.recommendedBooks = [...books];
        this.isLoading = false;
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    );
  }
}
```

---

## Implementation Roadmap

### Phase 1: Connect to Services (Week 1)
- [ ] Replace sample data with actual service calls
- [ ] Implement `BookService.getBooks()`
- [ ] Implement `UserService.getWishlist()`
- [ ] Set up error handling

### Phase 2: Add Routing (Week 1-2)
- [ ] Implement book detail navigation
- [ ] Create book detail page
- [ ] Add catalog page with filters
- [ ] Implement back button

### Phase 3: Cart Integration (Week 2)
- [ ] Implement cart add/remove
- [ ] Show cart item count in navbar
- [ ] Update cart on add/remove
- [ ] Show toast notifications

### Phase 4: User Features (Week 2-3)
- [ ] Implement wishlist functionality
- [ ] Store wishlist in localStorage or backend
- [ ] Show wishlist page
- [ ] Sync across tabs/devices

### Phase 5: Enhancements (Week 3-4)
- [ ] Add loading skeletons
- [ ] Implement lazy loading
- [ ] Add search functionality
- [ ] Add advanced filters
- [ ] Implement recommendations engine

---

## Service Integration Checklist

Each component has TODO comments for service integration:

```typescript
// Example: In BookCardComponent
// TODO: Navigate to book details page
// this.router.navigate(['/books', this.book.id]);

// TODO: Add to cart service call
// this.cartService.addToCart(this.book, 1);

// TODO: Call user service to toggle wishlist
// this.userService.toggleWishlist(this.book.id);
```

## Testing Your Components

### Test Add to Cart:
```typescript
// Should:
// 1. Call CartService.addToCart()
// 2. Update cart count in navbar
// 3. Show success toast
// 4. Update button state

// Write unit tests:
it('should add book to cart', () => {
  component.onAddToCart(mockBook);
  expect(cartService.addToCart).toHaveBeenCalledWith(mockBook, 1);
});
```

### Test Wishlist:
```typescript
// Should:
// 1. Toggle wishlist state
// 2. Call UserService.toggleWishlist()
// 3. Show appropriate message
// 4. Update heart icon state

it('should toggle wishlist', () => {
  component.onWishlistToggled(mockBook);
  expect(userService.toggleWishlist).toHaveBeenCalledWith(mockBook.id);
});
```

---

## Next Steps

1. **Extract sample data** → Make API calls to real backend
2. **Implement event handlers** → Wire up all TODOs
3. **Add toast notifications** → User feedback
4. **Create book details page** → `BookDetailsComponent`
5. **Add filters and search** → Enhanced discovery
6. **Implement recommendations** → Personalization

All components are ready for functionality! Just follow the TODO comments and implement service calls. 🚀
