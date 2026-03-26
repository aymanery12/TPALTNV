# BookShop E-Commerce Frontend - Folder Structure Documentation

## Project Architecture Overview

This is a modern Angular 21 e-commerce frontend for an online bookshop. The project follows a feature-based modular architecture with clear separation of concerns.

### Directory Structure

```
src/app/
├── core/                           # Singleton services & app-wide utilities
│   ├── services/                   # Core business logic services
│   │   ├── book.service.ts         # Book catalog & management
│   │   ├── cart.service.ts         # Shopping cart operations
│   │   ├── order.service.ts        # Order management
│   │   ├── user.service.ts         # User & authentication
│   │   └── index.ts                # Barrel export
│   ├── guards/                     # Route protection
│   │   ├── auth.guard.ts           # Authentication guard
│   │   └── index.ts                # Barrel export
│   ├── interceptors/               # HTTP interceptors
│   │   ├── auth.interceptor.ts     # Auth token injection
│   │   ├── error.interceptor.ts    # Centralized error handling
│   │   └── index.ts                # Barrel export
│
├── shared/                         # Shared, reusable code
│   ├── models/                     # TypeScript interfaces & types
│   │   ├── book.model.ts           # Book, Author, Genre, BookReview
│   │   ├── cart.model.ts           # CartItem, Cart
│   │   ├── order.model.ts          # Order, OrderStatus, ShippingAddress
│   │   ├── user.model.ts           # User, UserPreferences, Wishlist
│   │   └── index.ts                # Barrel export
│   ├── components/                 # Shared UI components
│   │   # Components like buttons, modals, badges to be added
│   ├── pipes/                      # Custom Angular pipes
│   │   # Pipes like currency formatter, date formatter to be added
│   ├── directives/                 # Custom Angular directives
│   │   # Directives like lazy loading, click-outside to be added
│   ├── utils/                      # Utility functions
│   │   ├── common.util.ts          # Common utilities
│   │   └── index.ts                # Barrel export
│
├── layout/                         # Layout & shell components
│   ├── navbar/                     # Top navigation bar
│   │   ├── navbar.ts
│   │   ├── navbar.html
│   │   └── navbar.scss
│   ├── footer/                     # Footer component
│   │   ├── footer.ts
│   │   ├── footer.html
│   │   └── footer.scss
│   ├── hero-banner/                # Hero banner
│   ├── category-nav/               # Category navigation
│   ├── sidebar-filters/            # Filter sidebar
│
├── features/                       # Feature modules (lazy-loaded)
│   ├── home/                       # Landing page
│   │   ├── home-module.ts
│   │   └── home-page/
│   │
│   ├── catalog/                    # Book catalog (formerly "products")
│   │   ├── catalog.module.ts       # Feature module
│   │   ├── book-list/              # Book listing/search
│   │   │   └── book-list.ts
│   │   ├── book-card/              # Individual book card
│   │   │   └── book-card.ts
│   │   └── book-filters/           # Filter component (to be added)
│   │
│   ├── book-details/               # Single book details page
│   │   ├── book-details.module.ts
│   │   ├── book-details.component.ts
│   │   └── reviews/                # Book reviews section
│   │       └── reviews.component.ts
│   │
│   ├── cart/                       # Shopping cart
│   │   ├── cart-module.ts
│   │   └── cart-page/
│   │
│   ├── checkout/                   # Checkout process
│   │   ├── checkout.module.ts
│   │   ├── checkout-page.ts
│   │   └── payment/                # Payment section (to be added)
│   │
│   ├── orders/                     # Order management
│   │   ├── orders-module.ts
│   │   ├── order-list/             # View past orders
│   │   └── order-details/          # Track single order
│   │
│   └── user-profile/               # User account & settings
│       ├── user-profile.module.ts
│       ├── user-profile-page.ts
│       └── wishlist/               # Saved books
│           └── wishlist-page.ts
│
├── app.ts                          # Root component
├── app.routes.ts                   # Route configuration
├── app.config.ts                   # App configuration
└── app.scss                        # Global styles
```

## Architecture Principles

### 1. **Core Module**
- **Purpose**: Singleton services and app-wide utilities
- **Imports**: Provided in `root` to ensure single instance
- **Usage**: Authentication, API calls, global state
- **Key Services**:
  - `BookService`: Manages book catalog operations
  - `CartService`: Shopping cart state and operations
  - `OrderService`: Order management
  - `UserService`: User authentication and profile

### 2. **Shared Module**
- **Purpose**: Reusable components, pipes, directives, and models
- **Design**: Stateless and non-feature-specific
- **Models**: TypeScript interfaces for strong typing
- **Components**: Generic UI elements (to be added)

### 3. **Features (Lazy-Loaded)**
- **Home**: Landing/dashboard
- **Catalog**: Browse and search books (replaces generic "products")
- **Book Details**: Individual book information with reviews
- **Cart**: Shopping cart management
- **Checkout**: Payment and shipping
- **Orders**: Order history and tracking
- **User Profile**: Account management and wishlist

### 4. **Layout**
- **Navigation**: Navbar with cart indicator
- **Filters**: Sidebar for search filters
- **Banners**: Hero section
- **Footer**: Site-wide footer

## Key Improvements for BookShop

1. **Domain-Specific Models**: Book, Author, Genre, BookReview, etc.
2. **Book-Focused Features**: Catalog, Reviews, Wishlist
3. **Proper Separation**: Core services vs Feature components
4. **Scalability**: Ready for adding: ratings, recommendations, author profiles
5. **Type Safety**: Strong TypeScript interfaces
6. **Future-Ready**: Structure supports adding: admin panel, analytics, recommendations engine

## Service Usage Example

```typescript
// Inject services in components
constructor(
  private bookService: BookService,
  private cartService: CartService,
  private userService: UserService
) {}

// Use in component
ngOnInit() {
  this.books$ = this.bookService.getBooks();
  this.user$ = this.userService.getCurrentUser();
}

// Add to cart
addToCart(book: Book) {
  this.cartService.addToCart(book, 1);
}
```

## Next Steps for Implementation

1. **Migrate existing components** from `/src/app/products` to `/src/app/features/catalog`
2. **Update routes** in `app.routes.ts` (use the provided `app.routes.new.ts` as reference)
3. **Implement services** with actual API calls
4. **Create shared components** (pagination, ratings, search box)
5. **Build feature-specific components** with proper module organization
6. **Add HTTP interceptors** for authentication and error handling
7. **Implement guards** for protected routes (checkout, profile)

## Type Safety & Models

All API responses and component inputs/outputs are properly typed using models from `/shared/models/`. This ensures:
- Better IDE autocomplete
- Compile-time error checking
- Self-documenting code
- Easier refactoring

## Routing Structure

- **Root** → Home
- **`/catalog`** → Book listing with filters
- **`/books/:id`** → Book details page
- **`/cart`** → Shopping cart
- **`/checkout`** → Payment & shipping
- **`/orders`** → Order history
- **`/profile`** → User account
- **`/profile/wishlist`** → Saved books

Legacy `/products` routes redirect to `/catalog` for backward compatibility.

---

**Created**: March 16, 2026  
**Framework**: Angular 21 (Standalone Components)  
**Styling**: SCSS + Tailwind CSS
