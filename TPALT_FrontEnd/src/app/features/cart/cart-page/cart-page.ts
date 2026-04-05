import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { CartItem } from '../../../shared/models/cart.model';
import { LanguageService } from '../../../core/services/language.service';

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
                    <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-600 transition-colors font-bold"
                            (click)="changeQty(item, 1)">+</button>
                  </div>
                  <button class="text-xs text-red-400 hover:text-red-300 transition-colors"
                      (click)="remove(item)">{{ t('cart.remove') }}</button>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-amber-400 font-bold text-lg">
                  {{ (item.book.price * item.quantity) | number: '1.2-2' }} €
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
                <hr class="border-slate-600 my-3">
                <div class="flex justify-between font-bold text-white text-base">
                  <span>{{ t('cart.total') }}</span>
                  <span class="text-amber-400">{{ total | number: '1.2-2' }} €</span>
                </div>
              </div>

              <!-- Address form (shown when orderMode=true) -->
              <div *ngIf="orderMode" class="mb-4">
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ t('cart.shippingAddress') }}</label>
                <textarea
                  [(ngModel)]="shippingAddress"
                  rows="3"
                  [placeholder]="t('cart.shippingPlaceholder')"
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
                        [disabled]="isOrdering || !shippingAddress.trim()"
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
export class CartPage implements OnInit {
  items: CartItem[] = [];
  total = 0;
  totalItems = 0;

  orderMode = false;
  shippingAddress = '';
  isOrdering = false;
  orderError = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.items = items;
      this.total = items.reduce((s, i) => s + i.book.price * i.quantity, 0);
      this.totalItems = items.reduce((s, i) => s + i.quantity, 0);
      setTimeout(() => this.cdr.detectChanges(), 0);
    });
  }

  placeOrder(): void {
    if (!this.shippingAddress.trim()) return;
    this.isOrdering = true;
    this.orderError = '';

    const order = {
      shippingAddress: this.shippingAddress.trim(),
      items: this.items.map(i => ({
        book: { id: i.book.id },
        quantity: i.quantity,
        price: i.book.price
      }))
    };

    this.orderService.createOrder(order).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.isOrdering = false;
        this.orderError = this.t('cart.orderError');
      }
    });
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  changeQty(item: CartItem, delta: number): void {
    this.cartService.updateQuantity(item.id, item.quantity + delta);
  }

  remove(item: CartItem): void {
    this.cartService.removeFromCart(item.id);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }
}