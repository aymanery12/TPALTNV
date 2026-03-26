# BookShop E-Commerce Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Angular 21 Frontend                         │
│                    BookShop E-Commerce Platform                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┬──────────────────────┬──────────┬──────────────────────┐
│   HOME      │     CATALOG          │  CART    │    USER PROFILE      │
│   PAGE      │   (Browse Books)     │  MODULE  │     MODULE           │
└─────────────┴──────────────────────┴──────────┴──────────────────────┘
      │               │                   │              │
      │               ├─ Book List        │              ├─ Profile Page
      │               │  Component        │              │
      │               │                   │              └─ Wishlist Page
      │               ├─ Book Card        │
      │               │  Component        │
      │               │                   │
      │               └─ Book Filters     │
      │                  Component        │
      │                                   │
      │               BOOK DETAILS        │
      │               CHECKOUT MODULE     │
      │                                   │
      └───────────────┬───────────────────┴──────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │      LAYOUT LAYER          │
        │  ┌────────────────────────┐│
        │  │   Navbar Component     ││
        │  ├────────────────────────┤│
        │  │  Footer Component      ││
        │  ├────────────────────────┤│
        │  │  Hero Banner Component ││
        │  └────────────────────────┘│
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │     DATA LAYER (Core)      │
        │  ┌────────────────────────┐│
        │  │  BookService           ││
        │  │  • getBooks()          ││
        │  │  • searchBooks()       ││
        │  │  • getRecommended()    ││
        │  ├────────────────────────┤│
        │  │  CartService           ││
        │  │  • addToCart()         ││
        │  │  • removeFromCart()    ││
        │  │  • getCartTotal()      ││
        │  ├────────────────────────┤│
        │  │  OrderService          ││
        │  │  • createOrder()       ││
        │  │  • trackOrder()        ││
        │  ├────────────────────────┤│
        │  │  UserService           ││
        │  │  • login()             ││
        │  │  • getWishlist()       ││
        │  └────────────────────────┘│
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   HTTP LAYER              │
        │  ┌────────────────────────┐│
        │  │ AuthInterceptor        ││
        │  │ ErrorInterceptor       ││
        │  └────────────────────────┘│
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │    BACKEND API             │
        │  • /api/books              │
        │  • /api/cart               │
        │  • /api/orders             │
        │  • /api/auth               │
        └────────────────────────────┘
```

## Data Flow Example: Adding Book to Cart

```
User Click
   │
   ▼
Book Card Component (addToCart)
   │
   ▼
CartService.addToCart(book)
   │
   ▼
HTTP POST /api/cart/items ─────────┐
   │                               │
   ▼                               ▼
AuthInterceptor                Backend
(Adds JWT token)               API
   │                               │
   │◄─────────────────────────────┘
   │
   ▼
ErrorInterceptor
(Handles any errors)
   │
   ▼
Update CartItem$ BehaviorSubject
   │
   ▼
Cart Component Receives Update
   │
   ▼
UI Re-renders
```

## Module Dependency Graph

```
ROOT APP (Standalone)
    │
    ├── Layout Components
    │   ├── Navbar
    │   ├── Footer
    │   ├── Hero Banner
    │   └── Sidebar Filters
    │
    ├── FEATURES (Lazy-Loaded)
    │   ├── Home Module
    │   │
    │   ├── Catalog Module
    │   │   ├── Book List Component
    │   │   ├── Book Card Component
    │   │   └── Catalog Module Config
    │   │
    │   ├── Book Details Module
    │   │   └── Book Details Component
    │   │
    │   ├── Cart Module
    │   │   └── Cart Page Component
    │   │
    │   ├── Checkout Module
    │   │   └── Checkout Page Component
    │   │
    │   ├── Orders Module
    │   │   ├── Order List Component
    │   │   └── Order Details Component
    │   │
    │   └── User Profile Module
    │       ├── Profile Page Component
    │       └── Wishlist Page Component
    │
    └── CORE (Singleton)
        ├── Services
        │   ├── BookService
        │   ├── CartService
        │   ├── OrderService
        │   └── UserService
        │
        ├── Guards
        │   └── AuthGuard
        │
        └── Interceptors
            ├── AuthInterceptor
            └── ErrorInterceptor

SHARED (Reusable)
├── Models
│   ├── book.model.ts
│   ├── cart.model.ts
│   ├── order.model.ts
│   └── user.model.ts
├── Components
│   └── (To be implemented)
├── Pipes
│   └── (To be implemented)
├── Directives
│   └── (To be implemented)
└── Utils
    └── common.util.ts
```

## Feature Module Routes

```
/                    → HOME PAGE (Home Module)
├── /home            Redirect to home
├── /catalog         CATALOG PAGE (Catalog Module)
│   └── /catalog/search
├── /books/:id       BOOK DETAILS (Book Details Module)
├── /cart            SHOPPING CART (Cart Module)
├── /checkout        CHECKOUT FLOW (Checkout Module)
├── /orders          ORDER HISTORY (Orders Module)
├── /profile         USER PROFILE (User Profile Module)
│   ├── /profile/settings
│   └── /profile/wishlist
└── /products        → /catalog (Legacy redirect)
```

## Type Safety & Models

```
Book Model
├── id: string
├── title: string
├── isbn: string
├── authors: Author[]
├── genres: Genre[]
├── description: string
├── price: number
├── coverImageUrl: string
├── rating: number
├── reviewCount: number
├── inStock: boolean
└── stockQuantity: number

Author Model
├── id: string
├── name: string
├── biography?: string
└── imageUrl?: string

Genre Model
├── id: string
├── name: string
└── description?: string

Order Model
├── id: string
├── userId: string
├── items: CartItem[]
├── shippingAddress: ShippingAddress
├── total: number
├── status: 'pending' | 'processing' | 'shipped' | 'delivered'
└── createdAt: Date
```

## Folder Structure Benefits

✓ **Scalability** - Easy to add new features without affecting existing ones
✓ **Maintainability** - Clear separation of concerns
✓ **Lazy Loading** - Features load only when needed
✓ **Type Safety** - Strong TypeScript interfaces throughout
✓ **Code Reuse** - Shared components, pipes, directives
✓ **Testing** - Services easily mockable for unit tests
✓ **Collaboration** - Multiple developers can work on different features
✓ **Documentation** - Self-documenting with clear naming conventions

## Next Immediate Actions

1. ✅ Folder structure created
2. ✅ Core services scaffolded
3. ✅ Models defined
4. ✅ Guards & Interceptors ready
5. ⏳ Migrate existing product components
6. ⏳ Implement service methods with API calls
7. ⏳ Create HTTP client providers
8. ⏳ Build missing components
9. ⏳ Add tests for services
10. ⏳ Deploy and monitor

---
**Architecture Version**: 1.0  
**Date**: March 16, 2026  
**Framework**: Angular 21 (Standalone Components)
