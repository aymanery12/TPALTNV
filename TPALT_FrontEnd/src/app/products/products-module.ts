export interface Product {
  id: number;
  title: string;
  author: string;
  price: number;
  priceCents: number;
  badge?: 'BEST_SELLER' | 'SALE' | null;
  salePercent?: number;
  salePrice?: number;
  listPrice?: number;
  rating: number;
  ratingsCount: string;
  subtitle?: string;
  imageUrl: string;
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [],
  imports: [CommonModule],
})
export class HomeModule {}
