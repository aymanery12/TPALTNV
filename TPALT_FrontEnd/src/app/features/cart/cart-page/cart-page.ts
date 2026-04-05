import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartItem } from '../../../shared/models/cart.model';
import { Book } from '../../../shared/models/book.model';
import { LanguageService } from '../../../core/services/language.service';
import { AddressAutocompleteService } from '../../../core/services/address-autocomplete.service';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Navbar, Footer],
  template: `
    <div class="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      <app-navbar></app-navbar>

      <main class="flex-1 max-w-[1440px] mx-auto w-full p-4 pt-10 md:p-8 md:pt-14">
        <h1 class="text-2xl font-bold mb-6">{{ t('cart.title') }}</h1>

        <!-- Empty state -->
        <div *ngIf="items.length === 0"
             class="bg-slate-800/50 rounded-xl p-12 text-center text-slate-400">
          <span class="material-symbols-outlined text-6xl mb-4 block text-slate-600">shopping_cart</span>
          <p class="text-lg font-medium">{{ t('cart.emptyTitle') }}</p>
          <p class="text-sm mt-1 mb-6">{{ t('cart.emptyHint') }}</p>
          <a routerLink="/catalog"
             class="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors">
            {{ t('cart.exploreCatalog') }}
          </a>
        </div>

        <!-- Cart content -->
        <div *ngIf="items.length > 0" class="flex flex-col lg:flex-row gap-8">

          <!-- Items list -->
          <div class="flex-1 space-y-4">
            <div *ngFor="let item of items"
                 class="flex gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <img [src]="item.book.coverImageUrl || item.book.imageUrl"
                   [alt]="item.book.title"
                   referrerpolicy="no-referrer"
                   (error)="$any($event.target).src='book-placeholder.svg'"
                   class="w-20 h-28 object-cover rounded-lg shrink-0">
              <div class="flex-1">
                <h3 class="font-bold text-white mb-1">{{ item.book.title }}</h3>
                <p class="text-sm text-slate-400 mb-3">
                  {{ item.book.authors ? item.book.authors[0]?.name : (item.book.author?.[0] || '') }}
                </p>
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                    <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-600 transition-colors font-bold"
                            (click)="changeQty(item, -1)">−</button>
                    <span class="w-8 text-center text-sm font-bold">{{ item.quantity }}</span>
                    <button class="w-7 h-7 rounded flex items-center justify-center transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                            [disabled]="isQtyIncreaseBlocked(item)"
                            [title]="isQtyIncreaseBlocked(item) ? t('cart.maxQtyReached').replace('{{count}}', stockCountLabel(item)) : ''"
                            (click)="changeQty(item, 1)">+</button>
                  </div>
                  <button class="text-xs text-red-400 hover:text-red-300 transition-colors"
                      (click)="remove(item)">{{ t('cart.remove') }}</button>
                </div>
                <p *ngIf="isQtyIncreaseBlocked(item)" class="text-xs text-amber-300 mt-2">
                  {{ t('cart.maxQtyReached').replace('{{count}}', stockCountLabel(item)) }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <span class="text-amber-400 font-bold text-lg">
                  {{ itemLineTotal(item) | number: '1.2-2' }} €
                </span>
              </div>
            </div>
          </div>

          <!-- Order summary -->
          <div class="lg:w-80 shrink-0">
            <div class="bg-slate-800/50 rounded-xl p-6 border border-slate-700 sticky top-24">
              <h2 class="font-bold text-lg mb-4">{{ t('cart.summary') }}</h2>
              <div class="space-y-2 text-sm mb-4">
                <div class="flex justify-between text-slate-300">
                  <span>{{ t('cart.subtotal').replace('{{count}}', totalItems.toString()) }}</span>
                  <span>{{ total | number: '1.2-2' }} €</span>
                </div>
                <div class="flex justify-between text-slate-300">
                  <span>{{ t('cart.delivery') }}</span>
                  <span class="text-green-400">{{ t('cart.freeDelivery') }}</span>
                </div>
                <div class="flex justify-between text-slate-300">
                  <span>{{ t('cart.paymentMethod') }}</span>
                  <span class="text-amber-300">{{ t('cart.cashOnDelivery') }}</span>
                </div>
                <hr class="border-slate-600 my-3">
                <div class="flex justify-between font-bold text-white text-base">
                  <span>{{ t('cart.total') }}</span>
                  <span class="text-amber-400">{{ total | number: '1.2-2' }} €</span>
                </div>
              </div>

              <!-- Address form (shown when orderMode=true) -->
              <div *ngIf="orderMode" class="mb-4 relative">
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ t('cart.shippingAddress') }}</label>
                <input
                  [ngModel]="shippingAddress"
                  (ngModelChange)="onShippingAddressInput($event)"
                  (focus)="onAddressFocus()"
                  (blur)="onAddressBlur()"
                  [placeholder]="t('cart.shippingPlaceholder')"
                  autocomplete="street-address"
                  class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors">

                <div *ngIf="isAddressLoading" class="text-xs text-slate-400 mt-2">{{ t('cart.addressSearching') }}</div>

                <ul *ngIf="showAddressSuggestions"
                    class="absolute z-20 left-0 right-0 mt-2 max-h-56 overflow-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
                  <li *ngFor="let suggestion of addressSuggestions"
                      (mousedown)="selectAddressSuggestion(suggestion)"
                      class="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors">
                    {{ suggestion }}
                  </li>
                </ul>

                <label class="block text-sm font-medium text-slate-300 mt-3 mb-2">{{ t('cart.comment') }}</label>
                <textarea
                  [(ngModel)]="deliveryComment"
                  rows="3"
                  [placeholder]="t('cart.commentPlaceholder')"
                  class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 resize-none placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors">
                </textarea>

                <p *ngIf="orderError" class="text-red-400 text-xs mt-1">{{ orderError }}</p>
              </div>

              <!-- Boutons -->
              <button *ngIf="!orderMode"
                      class="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-lg mb-3"
                      (click)="orderMode = true">
                {{ t('cart.placeOrder') }}
              </button>

              <div *ngIf="orderMode" class="flex flex-col gap-2 mb-3">
                <button class="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50"
                        [disabled]="isOrdering || !canSubmitOrder()"
                        (click)="placeOrder()">
                  <span *ngIf="!isOrdering">{{ t('cart.confirmOrder') }}</span>
                  <span *ngIf="isOrdering">{{ t('cart.processing') }}</span>
                </button>
                <button class="w-full border border-slate-600 text-slate-300 text-sm py-2 rounded-xl transition-colors hover:border-slate-400"
                        (click)="orderMode = false; orderError = ''">
                  {{ t('cart.cancel') }}
                </button>
              </div>

              <button *ngIf="!orderMode"
                      class="w-full border border-slate-600 hover:border-slate-400 text-slate-300 text-sm py-2 rounded-xl transition-colors"
                      (click)="clearCart()">
                {{ t('cart.clear') }}
              </button>
            </div>
          </div>
        </div>
      </main>

      <app-footer></app-footer>
    </div>
  `,
  styleUrl: './cart-page.scss'
})
export class CartPage implements OnInit, OnDestroy {
  items: CartItem[] = [];
  total = 0;
  totalItems = 0;

  orderMode = false;
  shippingAddress = '';
  deliveryComment = '';
  addressSuggestions: string[] = [];
  isAddressLoading = false;
  showAddressSuggestions = false;
  isOrdering = false;
  orderError = '';

  private readonly addressInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly addressCache = new Map<string, string[]>();

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private addressAutocompleteService: AddressAutocompleteService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.items = items;
      this.total = items.reduce((s, i) => s + this.itemLineTotal(i), 0);
      this.totalItems = items.reduce((s, i) => s + i.quantity, 0);
      setTimeout(() => this.cdr.detectChanges(), 0);
    });

    this.addressInput$
      .pipe(
        debounceTime(160),
        distinctUntilChanged(),
        switchMap(query => this.addressAutocompleteService.searchFrenchAddresses(query).pipe(
          map(suggestions => ({ query, suggestions })),
          catchError(() => of({ query, suggestions: [] as string[] }))
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(({ query, suggestions }) => {
        this.addressCache.set(query.toLowerCase(), suggestions);
        this.addressSuggestions = suggestions;
        this.showAddressSuggestions = this.shippingAddress.trim().length >= 3 && suggestions.length > 0;
        this.isAddressLoading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onShippingAddressInput(value: string): void {
    this.shippingAddress = value;
    const trimmedValue = value.trim();
    const cacheKey = trimmedValue.toLowerCase();

    if (trimmedValue.length < 3) {
      this.addressSuggestions = [];
      this.showAddressSuggestions = false;
      this.isAddressLoading = false;
      return;
    }

    const cachedSuggestions = this.addressCache.get(cacheKey);
    if (cachedSuggestions) {
      this.addressSuggestions = cachedSuggestions;
      this.showAddressSuggestions = cachedSuggestions.length > 0;
      this.isAddressLoading = false;
      return;
    }

    this.isAddressLoading = true;
    this.addressInput$.next(trimmedValue);
  }

  onAddressFocus(): void {
    if (this.addressSuggestions.length > 0) {
      this.showAddressSuggestions = true;
    }
  }

  onAddressBlur(): void {
    // Delay is needed so click events on suggestion items can run first.
    setTimeout(() => {
      this.showAddressSuggestions = false;
      this.cdr.detectChanges();
    }, 120);
  }

  selectAddressSuggestion(address: string): void {
    this.shippingAddress = address;
    this.addressSuggestions = [];
    this.showAddressSuggestions = false;
  }

  placeOrder(): void {
    if (!this.authService.isLoggedInSnapshot()) {
      this.isOrdering = false;
      this.orderError = this.t('cart.loginRequired');
      return;
    }

    if (!this.canSubmitOrder()) {
      this.orderError = this.t('cart.addressRequired');
      return;
    }

    this.isOrdering = true;
    this.orderError = '';

    const order = {
      shippingAddress: this.buildShippingPayload(),
      items: this.items.map(i => ({
        book: { id: i.book.id },
        quantity: i.quantity,
        price: this.effectiveUnitPrice(i.book)
      }))
    };

    this.orderService.createOrder(order).subscribe({
      next: (createdOrder) => {
        this.cartService.clearCart();
        this.router.navigate(['/orders'], {
          state: {
            justOrdered: true,
            createdOrderId: createdOrder?.id ?? null,
            orderedAt: Date.now()
          }
        });
      },
      error: (err) => {
        this.isOrdering = false;
        this.orderError = (err?.status === 401 || err?.status === 403)
          ? this.t('cart.loginRequired')
          : this.t('cart.orderError');
      }
    });
  }

  canSubmitOrder(): boolean {
    return !!this.shippingAddress.trim();
  }

  private buildShippingPayload(): string {
    const lines: string[] = [this.shippingAddress.trim()];

    if (this.deliveryComment.trim()) {
      lines.push(`${this.t('cart.commentPrefix')}: ${this.deliveryComment.trim()}`);
    }

    return lines.join('\n');
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  changeQty(item: CartItem, delta: number): void {
    if (delta > 0) {
      const maxStock = item.book.quantity;
      if (typeof maxStock === 'number' && Number.isFinite(maxStock) && item.quantity >= maxStock) {
        this.orderError = this.t('cart.maxQtyReached').replace('{{count}}', String(maxStock));
        return;
      }
    }
    this.orderError = '';
    this.cartService.updateQuantity(item.id, item.quantity + delta);
  }

  remove(item: CartItem): void {
    this.cartService.removeFromCart(item.id);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  isQtyIncreaseBlocked(item: CartItem): boolean {
    const maxStock = item.book.quantity;
    return typeof maxStock === 'number' && Number.isFinite(maxStock) && item.quantity >= maxStock;
  }

  stockCountLabel(item: CartItem): string {
    const maxStock = item.book.quantity;
    return typeof maxStock === 'number' && Number.isFinite(maxStock) ? String(maxStock) : '0';
  }

  effectiveUnitPrice(book: Book): number {
    const basePrice = Number(book.price) || 0;
    const discount = Math.min(100, Math.max(0, Number(book.discount) || 0));
    return basePrice * (1 - discount / 100);
  }

  itemLineTotal(item: CartItem): number {
    return this.effectiveUnitPrice(item.book) * item.quantity;
  }
}