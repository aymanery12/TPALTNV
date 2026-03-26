# Component Usage Quick Reference

## Component Files Overview

```
📦 src/app/shared/components/
├── 📄 rating/
│   ├── rating.ts              - Display & interact with star ratings
│   └── rating.scss
│
├── 📄 book-card/
│   ├── book-card.ts           - Individual book card display
│   └── book-card.scss
│
├── 📄 book-grid/
│   ├── book-grid.ts           - Grid layout for books
│   └── book-grid.scss
│
├── 📄 hero-promo/
│   ├── hero-promo.ts          - Promotional banner
│   └── hero-promo.scss
│
└── 📄 index.ts                - Barrel exports for easy imports
```

---

## Quick Import Guide

```typescript
// Instead of typing the full path each time:
import { RatingComponent } from '../../shared/components/rating/rating';
import { BookCardComponent } from '../../shared/components/book-card/book-card';

// Use the barrel export:
import { 
  RatingComponent, 
  BookCardComponent, 
  BookGridComponent, 
  HeroPromoComponent 
} from '@shared/components';
```

---

## Component Input/Output Matrix

| Component | Inputs | Outputs | Purpose |
|-----------|--------|---------|---------|
| **RatingComponent** | `rating`, `reviewCount`, `showCount`, `interactive` | `ratingChanged` | Display/interact with star ratings |
| **BookCardComponent** | `book`, `badge`, `isInWishlist` | `bookClicked`, `addToCartClicked`, `wishlistToggled` | Display individual book |
| **BookGridComponent** | `books[]`, `wishlistBookIds[]` | `bookSelected`, `addToCart`, `wishlistToggled` | Grid layout propagator |
| **HeroPromoComponent** | `title`, `description`, `ctaText`, `fromColor`, `toColor`, `showDecorativeBox` | `ctaClicked` | Promotional banner |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    HomePage Component                    │
│  - Loads books from BookService                          │
│  - Manages wishlist state                                │
│  - Handles sorting                                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─────────────────────────┐
                 │                         │
                 ▼                         ▼
    ┌────────────────────┐    ┌──────────────────────────┐
    │  HeroPromoComponent│    │  BookGridComponent       │
    │                    │    │                          │
    │ @Output:          │    │ @Input:                 │
    │ ctaClicked ─────► │    │ - books[]               │
    │                    │    │ - wishlistBookIds[]     │
    └────────────────────┘    │                          │
                             │ @Output:               │
                             │ - bookSelected        │
                             │ - addToCart           │
                             │ - wishlistToggled     │
                             └────────┬──────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────────┐
                         │  BookCardComponent [×6]     │
                         │                             │
                         │ Displays:                  │
                         │ - Cover image              │
                         │ - Title / Author           │
                         │ - Rating                   │
                         │ - Price                    │
                         │                             │
                         │ Contains:                  │
                         │ ┌───────────────────────┐ │
                         │ │ RatingComponent       │ │
                         │ │ (5-star display)      │ │
                         │ └───────────────────────┘ │
                         │                             │
                         │ @Output:                  │
                         │ - bookClicked            │
                         │ - addToCartClicked       │
                         │ - wishlistToggled        │
                         └─────────────────────────────┘
```

---

## Event Flow Example: Adding Book to Cart

```
User clicks "Add to Cart" button
         │
         ▼
BookCardComponent.onAddToCart()
         │
         ├─ emit: addToCartClicked($event)
         │
         ▼
BookGridComponent catches event
         │
         ├─ emit: addToCart($event)
         │
         ▼
HomePage catches event
         │
         ├─ this.cartService.addToCart(book)
         │
         ├─ Show toast: "Added to cart!"
         │
         └─ Update cart count in navbar
```

---

## Component Selection Guide

**Choose based on your needs:**

| Need | Use Component | Notes |
|------|---------------|-------|
| Show star rating | `RatingComponent` | Standalone, reusable |
| Display single book | `BookCardComponent` | Emits 3 events |
| Show multiple books | `BookGridComponent` | Manages grid layout |
| Promotional banner | `HeroPromoComponent` | Customizable colors |
| Entire home page | `HomePage` | Uses all above |

---

## Event Handler Template

```typescript
// Copy this template and fill in your logic

// Book was clicked - navigate to details
onBookSelected(book: Book): void {
  console.log('Book selected:', book);
  // TODO: this.router.navigate(['/books', book.id]);
}

// Add to cart button clicked
onAddToCart(book: Book): void {
  console.log('Add to cart:', book);
  // TODO: this.cartService.addToCart(book, 1);
  // TODO: Show success toast
}

// Wishlist heart icon clicked
onWishlistToggled(book: Book): void {
  console.log('Wishlist toggled:', book);
  // TODO: this.userService.toggleWishlist(book.id);
  // TODO: Update wishlist state
}

// Promo CTA button clicked
onPromoCTAClick(): void {
  console.log('Promo CTA clicked');
  // TODO: Navigate to sale or filter page
}

// Sort selection changed
onSortChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const sortValue = select.value;
  console.log('Sort changed:', sortValue);
  // TODO: Implement sorting logic
}

// Pagination page changed
onPageChange(page: number): void {
  console.log('Page changed to:', page);
  // TODO: Load books for this page
}
```

---

## Service Integration Points

Each component has clear TODO comments for integration:

```typescript
// In BookCardComponent
// TODO: Navigate to book details page
// this.router.navigate(['/books', this.book.id]);

// TODO: Add to cart service call
// this.cartService.addToCart(this.book, 1);

// TODO: Call user service to toggle wishlist
// this.userService.toggleWishlist(this.book.id);

// In HeroPromoComponent
// TODO: Handle CTA click - navigate to sale page, filter, etc.
// this.router.navigate(['/catalog'], { queryParams: { onSale: true } });

// In HomePage
// TODO: Replace with actual service call
// this.bookService.getBooks().subscribe(books => {
//   this.books = books;
// });
```

---

## Testing Checklist

- [ ] All components render without errors
- [ ] Images load correctly
- [ ] Responsive layout works on mobile
- [ ] Hover effects appear
- [ ] Buttons are clickable
- [ ] Events are emitted correctly
- [ ] Data displays properly
- [ ] Sorting works
- [ ] Pagination is available

---

## Performance Optimization Tips

```typescript
// Use OnPush change detection
@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})

// Unsubscribe from observables to prevent memory leaks
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// Use trackBy function in *ngFor
<app-book-card 
  *ngFor="let book of books; trackBy: trackByBookId"
  [book]="book">
</app-book-card>

trackByBookId(index: number, book: Book): string {
  return book.id;
}
```

---

## Styling Customization

### Tailwind Classes Used
- `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` - Responsive grid
- `bg-primary` - Primary color (#136dec)
- `dark:bg-slate-800/50` - Dark mode
- `group-hover:` - Hover effects
- `transition-` - Smooth animations

### Override Styles
```scss
// In component.scss
.book-card {
  // Your custom styles
  background: linear-gradient(...);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## Common Patterns

### Pattern 1: Load Books and Display
```typescript
ngOnInit() {
  this.bookService.getBooks().subscribe(books => {
    this.books = books;
  });
}
```

### Pattern 2: Handle All Events
```typescript
// In template
<app-book-grid 
  [books]="books"
  (bookSelected)="onBookSelected($event)"
  (addToCart)="onAddToCart($event)"
  (wishlistToggled)="onWishlistToggled($event)">
</app-book-grid>

// In component
onBookSelected(book: Book): void { /* ... */ }
onAddToCart(book: Book): void { /* ... */ }
onWishlistToggled(book: Book): void { /* ... */ }
```

### Pattern 3: Manage Wishlist State
```typescript
wishlistBookIds: string[] = [];

onWishlistToggled(book: Book): void {
  const index = this.wishlistBookIds.indexOf(book.id);
  if (index > -1) {
    this.wishlistBookIds.splice(index, 1);
  } else {
    this.wishlistBookIds.push(book.id);
  }
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Components not rendering | Check imports in component |
| Events not firing | Verify @Output() declarations |
| Data not displaying | Check [input] bindings |
| Styles not applying | Verify Tailwind CSS included |
| Images not showing | Check image URLs |
| Responsive layout broken | Check grid-cols classes |

---

## Resources

- Component Templates: See `.ts` files for template strings
- Component Styles: See `.scss` files for styling
- Models: `/shared/models/book.model.ts`
- Services: `/core/services/`
- Full Guide: `HOME_PAGE_IMPLEMENTATION.md`

---

**Components are production-ready!** Just add your functionality and enjoy building! 🚀
