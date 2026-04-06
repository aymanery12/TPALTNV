import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { OrderService } from '../../../core/services/order.service';
import { LanguageService } from '../../../core/services/language.service';
import { Order } from '../../../shared/models/order.model';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  template: `
    <div class="min-h-screen bg-[#0f0f1a] text-white flex flex-col">
      <app-navbar></app-navbar>

      <main class="flex-1 max-w-[1200px] mx-auto w-full p-4 pt-10 md:p-8 md:pt-14">
        <h1 class="text-2xl font-bold mb-6">{{ t('orders.title') }}</h1>

        <!-- Empty state -->
        <div *ngIf="!isLoading && orders.length === 0"
             class="bg-slate-800/50 rounded-xl p-12 text-center text-slate-400">
          <span class="material-symbols-outlined text-6xl mb-4 block text-slate-600">package_2</span>
          <p class="text-lg font-medium">{{ t('orders.emptyTitle') }}</p>
          <p class="text-sm mt-1 mb-6">{{ t('orders.emptyHint') }}</p>
          <a routerLink="/catalog"
             class="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors">
            {{ t('orders.exploreCatalog') }}
          </a>
        </div>

        <!-- Orders list -->
        <div *ngIf="!isLoading && orders.length > 0" class="space-y-6">
          <div *ngFor="let order of orders"
               class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">

            <!-- Order header -->
            <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-700 bg-slate-800/30">
              <div>
                <p class="text-xs text-slate-400 mb-0.5">{{ t('orders.orderNumber') }} #{{ order.id }}</p>
                <p class="text-sm text-slate-300">{{ order.orderDate | date:orderDateFormat }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-slate-400 mb-0.5">{{ t('orders.address') }}</p>
                <p class="text-sm text-slate-300 max-w-xs truncate">{{ formatShippingAddress(order.shippingAddress) }}</p>
              </div>
              <div class="text-right">
                <span [class]="getStatusClass(order.status)"
                      class="inline-block text-xs font-bold px-3 py-1 rounded-full mb-1">
                  {{ getStatusLabel(order.status) }}
                </span>
                <p class="text-amber-400 font-bold text-lg">{{ order.totalAmount | number:'1.2-2' }} €</p>
                <a [routerLink]="['/orders', order.id, 'tracking']"
                   class="inline-flex items-center gap-1 mt-2 text-amber-500 hover:text-amber-400 text-xs font-bold transition-colors">
                  <span class="material-symbols-outlined" style="font-size:14px;">track_changes</span>
                  {{ t('orders.trackOrder') }}
                </a>
              </div>
            </div>

            <!-- Order items -->
            <div class="divide-y divide-slate-700/50">
              <div *ngFor="let item of order.items"
                   class="flex items-center gap-4 px-6 py-4">
                <img [src]="item.book.imageUrl"
                     [alt]="item.book.title"
                     referrerpolicy="no-referrer"
                     (error)="$any($event.target).src='book-placeholder.svg'"
                     class="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-700">
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-white text-sm truncate">{{ item.book.title }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    {{ item.book.author?.[0] || '' }}
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-slate-300 text-sm">x{{ item.quantity }}</p>
                  <p class="text-amber-400 font-bold text-sm">{{ item.price | number:'1.2-2' }} €</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div *ngIf="errorMsg" class="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center text-red-300">
          <span class="material-symbols-outlined text-4xl mb-2 block">error</span>
          <p>{{ errorMsg }}</p>
          <a routerLink="/login" class="mt-3 inline-block text-amber-400 hover:underline text-sm">
            {{ t('orders.login') }}
          </a>
        </div>
      </main>

      <app-footer></app-footer>
    </div>
  `
})
export class OrdersPage implements OnInit {
  orders: Order[] = [];
  isLoading = true;
  errorMsg = '';
  orderDateFormat = 'dd/MM/yyyy a HH:mm';
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private emptyRetryAttempts = 0;
  private readonly maxEmptyRetryAttempts = 5;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private languageService: LanguageService
  ) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  ngOnInit(): void {
    this.orderDateFormat = this.languageService.currentLanguage === 'en' ? 'MM/dd/yyyy, HH:mm' : 'dd/MM/yyyy a HH:mm';
    this.loadOrders(true);
  }

  ngOnDestroy(): void {
    this.stopPostOrderAutoRefresh();
  }

  private loadOrders(showLoading: boolean): void {
    if (showLoading) {
      this.isLoading = true;
    }
    this.errorMsg = '';

    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;
        this.cdr.detectChanges();

        if (orders.length > 0) {
          this.emptyRetryAttempts = 0;
          this.stopPostOrderAutoRefresh();
          return;
        }

        if (this.emptyRetryAttempts < this.maxEmptyRetryAttempts) {
          this.startPostOrderAutoRefresh();
        } else {
          this.stopPostOrderAutoRefresh();
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = this.t('orders.loadError');
        this.stopPostOrderAutoRefresh();
        this.cdr.detectChanges();
      }
    });
  }

  private startPostOrderAutoRefresh(): void {
    this.stopPostOrderAutoRefresh();

    this.refreshTimer = setTimeout(() => {
      if (this.orders.length > 0 || this.errorMsg) {
        this.stopPostOrderAutoRefresh();
        return;
      }

      this.emptyRetryAttempts += 1;
      if (this.emptyRetryAttempts > this.maxEmptyRetryAttempts) {
        this.stopPostOrderAutoRefresh();
        return;
      }

      this.loadOrders(false);
    }, 900);
  }

  private stopPostOrderAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  formatShippingAddress(rawAddress?: string): string {
    const value = (rawAddress ?? '').trim();
    if (!value) return '';

    return value
      .replace(/^Adresse:\s*/i, '')
      .replace(/^Address:\s*/i, '')
      .replace(/^Commentaire:\s*/i, `${this.t('orders.commentPrefix')} `)
      .replace(/^Comment:\s*/i, `${this.t('orders.commentPrefix')} `);
  }

  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      'EN_PREPARATION': this.t('profile.status.preparation'),
      'EXPEDIEE':       this.t('profile.status.shipped'),
      'LIVREE':         this.t('profile.status.delivered'),
      'ANNULEE':        this.t('orders.status.cancelled'),
    };
    return labels[status ?? ''] ?? (status ?? this.t('orders.status.inProgress'));
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'LIVREE':        return 'bg-green-500/20 text-green-400';
      case 'EXPEDIEE':      return 'bg-blue-500/20 text-blue-400';
      case 'EN_PREPARATION':return 'bg-amber-500/20 text-amber-400';
      case 'ANNULEE':       return 'bg-red-500/20 text-red-400';
      default:              return 'bg-slate-500/20 text-slate-400';
    }
  }
}