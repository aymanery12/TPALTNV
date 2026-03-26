# BookShop Frontend - Migration & Implementation Guide

## Overview
Your Angular e-commerce frontend has been reorganized into a modern, scalable structure optimized for a bookshop business. This guide explains the changes and how to implement the remaining work.

## What Changed

### File Reorganization Summary

#### New Directories Created
- **`core/`** - Singleton services, guards, interceptors
- **`shared/models/`** - TypeScript interfaces for type safety
- **`shared/utils/`** - Utility functions
- **`features/catalog/`** - Book catalog (renamed from generic "products")
- **`features/book-details/`** - New module for individual book pages
- **`features/checkout/`** - Dedicated checkout flow
- **`features/user-profile/`** - User account & wishlist

### Enhanced Services
Created production-ready service files:
- `BookService` - Catalog operations
- `CartService` - Shopping cart management
- `OrderService` - Order tracking
- `UserService` - Authentication & profile

### Domain Models
Created bookshop-specific TypeScript interfaces:
- `Book`, `Author`, `Genre`, `BookReview`
- `CartItem`, `Cart`
- `Order`, `OrderStatus`, `ShippingAddress`
- `User`, `UserPreferences`, `Wishlist`

### Guards & Interceptors
- `AuthGuard` - Protect routes requiring authentication
- `ErrorInterceptor` - Centralized HTTP error handling
- `AuthInterceptor` - Token injection for API calls

## Migration Steps

### Step 1: Update Route Configuration
Replace the old `app.routes.ts` with the new structure:

```bash
# Backup old routes
cp src/app/app.routes.ts src/app/app.routes.old.ts

# Use new routes (already created as app.routes.new.ts)
# Copy the content from app.routes.new.ts to app.routes.ts
```

### Step 2: Move Existing Components
Move existing product components to the new catalog structure:

```bash
# Move product card component
mv src/app/products/product-card/* src/app/features/catalog/book-card/

# Move product grid component  
mv src/app/products/product-grid/* src/app/features/catalog/book-list/

# Update imports in moved files:
# Change: '../products-module' → '../catalog.module'
```

### Step 3: Update Component Imports
In moved components, update type imports:

```typescript
// OLD
import { Product } from '../products-module';

// NEW (use the Book model from shared)
import { Book } from '../../../shared/models/book.model';
```

### Step 4: Implement Services
Populate the service methods with actual API calls:

```typescript
// Example in book.service.ts
constructor(private http: HttpClient) {}

getBooks(): Observable<Book[]> {
  return this.http.get<Book[]>('/api/books');
}

getBookById(id: string): Observable<Book> {
  return this.http.get<Book>(`/api/books/${id}`);
}
```

### Step 5: Set Up HTTP Client
Add HTTP interceptors to your app config:

```typescript
// In app.config.ts
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { AuthInterceptor, ErrorInterceptor } from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        errorInterceptor
      ])
    ),
    // ... other providers
  ]
};
```

### Step 6: Create Shared Components
Add reusable components to `shared/components/`:

```typescript
// Example: RatingComponent
@Component({
  selector: 'app-rating',
  standalone: true,
  template: `
    <div class="stars">
      <span *ngFor="let i of [1,2,3,4,5]">
        {{ i <= rating ? '★' : '☆' }}
      </span>
    </div>
  `
})
export class RatingComponent {
  @Input() rating: number = 0;
}
```

## Project Structure at a Glance

```
BookShop Frontend (Angular 21)
├── Home Module          → Landing page
├── Catalog Module       → Browse & search books
├── Book Details         → Individual book page
├── Cart Module          → Shopping cart
├── Checkout Module      → Payment & shipping
├── Orders Module        → Order history
├── User Profile Module  → Account & wishlist
└── Core Services        → API, Auth, Cart state
```

## API Integration Points

Each service has TODO comments indicating where to add API calls:

### BookService
- `getBooks()` → GET `/api/books`
- `getBookById(id)` → GET `/api/books/{id}`
- `searchBooks(query)` → GET `/api/books/search?q={query}`
- `getBooksByGenre(id)` → GET `/api/books/genre/{id}`

### CartService  
- `addToCart()` → POST `/api/cart/items`
- `removeFromCart()` → DELETE `/api/cart/items/{id}`
- `updateQuantity()` → PATCH `/api/cart/items/{id}`

### OrderService
- `createOrder()` → POST `/api/orders`
- `getOrders()` → GET `/api/orders`
- `trackOrder()` → GET `/api/orders/{id}`

### UserService
- `login()` → POST `/api/auth/login`
- `register()` → POST `/api/auth/register`
- `getWishlist()` → GET `/api/users/{id}/wishlist`
- `addToWishlist()` → POST `/api/users/{id}/wishlist`

## Key Features to Implement

### Phase 1 (Essential)
- [ ] Book catalog listing with filters
- [ ] Search functionality
- [ ] Shopping cart operations
- [ ] User authentication

### Phase 2 (Important)
- [ ] Book details page with reviews
- [ ] Checkout process
- [ ] Order history
- [ ] User wishlist

### Phase 3 (Enhancement)
- [ ] Book recommendations
- [ ] Rating/review system
- [ ] User preferences
- [ ] Notification system

## File Locations Reference

| Component | Location |
|-----------|----------|
| Book Model | `shared/models/book.model.ts` |
| Book Service | `core/services/book.service.ts` |
| Catalog Module | `features/catalog/catalog.module.ts` |
| Book Card | `features/catalog/book-card/` |
| Book List | `features/catalog/book-list/` |
| Book Details | `features/book-details/book-details.component.ts` |
| Cart Service | `core/services/cart.service.ts` |
| Auth Guard | `core/guards/auth.guard.ts` |
| Utilities | `shared/utils/common.util.ts` |

## Testing the Structure

### Verify folder structure is correct
```bash
find src/app -type d | sort
```

### Check all TypeScript files compile
```bash
ng build --configuration development
```

### Run the development server
```bash
npm start
# Visit http://localhost:4200
```

## Common Issues & Solutions

### Issue: Import paths don't resolve
**Solution**: Update relative import paths in moved components. Use `src/app` as reference point.

### Issue: Services not injecting properly
**Solution**: Ensure services have `providedIn: 'root'` decorator.

### Issue: Routes not working after migration  
**Solution**: Check that all lazy-loading paths in routes match actual module locations.

## Best Practices

1. **Always use models** from `shared/models` for type safety
2. **Inject services** from `core/services` in components
3. **Keep components standalone** where possible (Angular 21 style)
4. **Use barrel exports** from `index.ts` files for cleaner imports
5. **Lazy-load features** for better performance
6. **Protect routes** with `AuthGuard` where needed

## Questions & Support

Refer to `FOLDER_STRUCTURE.md` for detailed architecture documentation.

---

**Last Updated**: March 16, 2026  
**Angular Version**: 21.2.0  
**Architecture**: Feature-based modular design
