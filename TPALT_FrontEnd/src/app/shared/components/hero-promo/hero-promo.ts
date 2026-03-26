import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero-promo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
        class="mb-8 rounded-2xl overflow-hidden p-8 flex items-center justify-between shadow-lg"
        [ngStyle]="{'background': 'linear-gradient(to right, var(--from), var(--to))'}"
        [style.--from]="fromColorHex"
        [style.--to]="toColorHex">

      <!-- Text -->
      <div class="max-w-md text-white">
        <span *ngIf="badgeText"
              class="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
          {{ badgeText }}
        </span>
        <h2 class="text-3xl font-extrabold mb-2">{{ title }}</h2>
        <p class="text-lg opacity-90 mb-5">{{ description }}</p>
        <button
            class="bg-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-100"
            [style.color]="fromColorHex"
            (click)="onCtaClick()">
          {{ ctaText }}
        </button>
      </div>

      <!-- Decorative box -->
      <div *ngIf="showDecorativeBox"
           class="hidden md:block w-48 h-64 rounded-xl backdrop-blur-sm border border-white/30 transform rotate-6 flex items-center justify-center"
           style="background: rgba(255,255,255,0.1)">
        <span class="material-symbols-outlined text-white/60 text-6xl">auto_stories</span>
      </div>
    </div>
  `,
  styleUrl: './hero-promo.scss'
})
export class HeroPromoComponent {
  @Input() title: string = 'Summer Reading Event';
  @Input() description: string = 'Discover this season\'s top-rated titles at up to 40% off.';
  @Input() ctaText: string = 'Shop the Sale';
  @Input() badgeText: string = '🔥 Offres du jour';

  // Couleurs en hex directement (plus fiable que les classes Tailwind dynamiques)
  @Input() fromColorHex: string = '#1d4ed8';   // blue-700
  @Input() toColorHex: string = '#7c3aed';     // violet-600

  @Input() showDecorativeBox: boolean = true;

  // ✅ Route cible du bouton CTA
  @Input() ctaRoute: string = '/catalog';
  @Input() ctaQueryParams: Record<string, string> = {};

  @Output() ctaClicked = new EventEmitter<void>();

  constructor(private router: Router) {}

  onCtaClick(): void {
    this.ctaClicked.emit();
    // ✅ Navigation vers la route configurée
    this.router.navigate([this.ctaRoute], {
      queryParams: Object.keys(this.ctaQueryParams).length ? this.ctaQueryParams : undefined
    });
  }
}