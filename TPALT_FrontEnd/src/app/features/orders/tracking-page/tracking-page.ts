import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../shared/models/order.model';

interface TrackStep {
  key: string;
  label: string;
  icon: string;
  description: string;
  dateLabel?: string;
}

@Component({
  selector: 'app-tracking-page',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  template: `
    <div class="min-h-screen bg-slate-100 dark:bg-[#0f0f1a] text-slate-900 dark:text-white flex flex-col">
      <app-navbar></app-navbar>

      <main class="flex-1 max-w-[760px] mx-auto w-full px-4 pt-10 pb-16 md:pt-16">

        <!-- Back -->
        <a routerLink="/orders"
           class="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors mb-8">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          Retour à mes commandes
        </a>

        <!-- Loading -->
        <div *ngIf="isLoading" class="flex justify-center py-24">
          <div class="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
        </div>

        <!-- Error -->
        <div *ngIf="!isLoading && errorMsg"
             class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl p-8 text-center">
          <span class="material-symbols-outlined text-5xl text-red-400 block mb-3">error</span>
          <p class="text-red-600 dark:text-red-300">{{ errorMsg }}</p>
        </div>

        <ng-container *ngIf="!isLoading && order">

          <!-- Header card -->
          <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Commande</p>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">#{{ order.id }}</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Passée le {{ order.orderDate | date:'dd MMMM yyyy à HH:mm':'':'fr' }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Total</p>
                <p class="text-2xl font-bold text-amber-500 dark:text-amber-400">{{ order.totalAmount | number:'1.2-2' }} €</p>
              </div>
            </div>

            <!-- Cancelled banner -->
            <div *ngIf="order.status === 'ANNULEE'"
                 class="mt-5 flex items-center gap-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3">
              <span class="material-symbols-outlined text-red-500 dark:text-red-400">cancel</span>
              <div>
                <p class="font-bold text-red-600 dark:text-red-400 text-sm">Commande annulée</p>
                <p class="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">Cette commande a été annulée. Le stock a été restitué.</p>
              </div>
            </div>

            <!-- Chronopost tracking link -->
            <div *ngIf="order.trackingNumber && order.status !== 'ANNULEE'"
                 class="mt-5 flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-blue-500 dark:text-blue-400 text-2xl">local_shipping</span>
                <div>
                  <p class="text-xs text-blue-500/70 dark:text-blue-400/70 font-semibold uppercase tracking-wider">Numéro de suivi Chronopost</p>
                  <p class="font-mono font-bold text-blue-600 dark:text-blue-300 text-lg tracking-widest">{{ order.trackingNumber }}</p>
                </div>
              </div>
              <a [href]="chronopostUrl" target="_blank"
                 class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                Suivre sur Chronopost
                <span class="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
          </div>

          <!-- ── STEPPER ── -->
          <div *ngIf="order.status !== 'ANNULEE'"
               class="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-8">
              Suivi de votre commande
            </h2>

            <div class="relative">
              <!-- Connecting line -->
              <div class="absolute left-[22px] top-[44px] bottom-[44px] w-0.5 bg-slate-200 dark:bg-white/10 md:hidden"></div>
              <div class="hidden md:block absolute top-[22px] left-[calc(16.66%+22px)] right-[calc(16.66%+22px)] h-0.5 bg-slate-200 dark:bg-white/10"></div>

              <!-- Progress line overlay (completed portion) -->
              <div class="hidden md:block absolute top-[22px] h-0.5 bg-amber-400 transition-all duration-700"
                   [style.left]="'calc(16.66% + 22px)'"
                   [style.width]="progressWidth"></div>

              <!-- Steps — desktop horizontal / mobile vertical -->
              <div class="flex flex-col md:flex-row md:justify-between gap-6 md:gap-0">
                <div *ngFor="let step of steps; let i = index"
                     class="flex md:flex-col items-center md:items-center gap-4 md:gap-3 md:flex-1 relative">

                  <!-- Icon circle -->
                  <div class="shrink-0 relative z-10">
                    <!-- Completed -->
                    <div *ngIf="getStepState(i) === 'completed'"
                         class="w-11 h-11 rounded-full bg-green-500 dark:bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <span class="material-symbols-outlined text-white text-xl">check</span>
                    </div>
                    <!-- Active -->
                    <div *ngIf="getStepState(i) === 'active'"
                         class="w-11 h-11 rounded-full bg-amber-500 dark:bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/40 ring-4 ring-amber-400/20 animate-pulse">
                      <span class="material-symbols-outlined text-white dark:text-slate-900 text-xl">{{ step.icon }}</span>
                    </div>
                    <!-- Pending -->
                    <div *ngIf="getStepState(i) === 'pending'"
                         class="w-11 h-11 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                      <span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xl">{{ step.icon }}</span>
                    </div>
                  </div>

                  <!-- Label -->
                  <div class="md:text-center">
                    <p class="font-bold text-sm"
                       [class.text-green-600]="getStepState(i) === 'completed'"
                       [class.dark:text-green-400]="getStepState(i) === 'completed'"
                       [class.text-amber-600]="getStepState(i) === 'active'"
                       [class.dark:text-amber-400]="getStepState(i) === 'active'"
                       [class.text-slate-400]="getStepState(i) === 'pending'"
                       [class.dark:text-slate-500]="getStepState(i) === 'pending'">
                      {{ step.label }}
                    </p>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 md:max-w-[120px]">{{ step.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Address + items -->
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            <!-- Adresse -->
            <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                <span class="material-symbols-outlined text-base align-middle mr-1">location_on</span>
                Adresse de livraison
              </p>
              <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ formatAddress(order.shippingAddress) }}</p>
            </div>
            <!-- Paiement -->
            <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                <span class="material-symbols-outlined text-base align-middle mr-1">payments</span>
                Paiement
              </p>
              <p class="text-sm text-slate-700 dark:text-slate-300">Paiement à la livraison (COD)</p>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Aucun paiement en ligne requis</p>
            </div>
          </div>

          <!-- Items -->
          <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <p class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ order.items.length }} article(s)
              </p>
            </div>
            <div class="divide-y divide-slate-100 dark:divide-white/5">
              <div *ngFor="let item of order.items"
                   class="flex items-center gap-4 px-6 py-4">
                <img [src]="item.book.imageUrl"
                     [alt]="item.book.title"
                     referrerpolicy="no-referrer"
                     (error)="$any($event.target).src='book-placeholder.svg'"
                     class="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 dark:text-white text-sm truncate">{{ item.book.title }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ item.book.author?.[0] || '' }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-slate-500 dark:text-slate-400 text-sm">x{{ item.quantity }}</p>
                  <p class="font-bold text-amber-500 dark:text-amber-400 text-sm">{{ item.price | number:'1.2-2' }} €</p>
                </div>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
              <span class="text-sm text-slate-500 dark:text-slate-400">Total</span>
              <span class="font-bold text-amber-500 dark:text-amber-400 text-lg">{{ order.totalAmount | number:'1.2-2' }} €</span>
            </div>
          </div>

        </ng-container>
      </main>

      <app-footer></app-footer>
    </div>
  `
})
export class TrackingPage implements OnInit {

  order: Order | null = null;
  isLoading = true;
  errorMsg = '';

  readonly steps: TrackStep[] = [
    {
      key: 'EN_PREPARATION',
      label: 'Commande reçue',
      icon: 'inventory_2',
      description: 'En cours de préparation'
    },
    {
      key: 'EXPEDIEE',
      label: 'Expédiée',
      icon: 'local_shipping',
      description: 'Colis en route'
    },
    {
      key: 'LIVREE',
      label: 'Livrée',
      icon: 'check_circle',
      description: 'Commande reçue'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/orders']); return; }

    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Commande introuvable.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get currentStepIndex(): number {
    const map: Record<string, number> = {
      EN_PREPARATION: 0,
      EXPEDIEE: 1,
      LIVREE: 2,
    };
    return map[this.order?.status ?? ''] ?? 0;
  }

  getStepState(index: number): 'completed' | 'active' | 'pending' {
    const current = this.currentStepIndex;
    if (index < current) return 'completed';
    if (index === current) return 'active';
    return 'pending';
  }

  /** Width of the amber progress bar between step circles (desktop) */
  get progressWidth(): string {
    const pct = (this.currentStepIndex / (this.steps.length - 1)) * 100;
    return `${pct}%`;
  }

  get chronopostUrl(): string {
    return `https://www.chronopost.fr/tracking-no-redux/track?listeNumerosLT=${this.order?.trackingNumber}`;
  }

  formatAddress(raw?: string): string {
    return (raw ?? '')
      .replace(/^Adresse:\s*/i, '')
      .replace(/^Address:\s*/i, '');
  }
}
