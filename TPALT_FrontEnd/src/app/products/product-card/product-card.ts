import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../products-module';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  @Input() product!: Product;

  @Output() addToCart     = new EventEmitter<Product>();
  @Output() cardClicked   = new EventEmitter<Product>();
  @Output() wishlistToggled = new EventEmitter<Product>();

  isInWishlist = false;

  // Étoiles pleines
  get fullStars(): number { return Math.floor(this.product.rating); }

  // Demi-étoile
  get hasHalfStar(): boolean {
    return this.product.rating % 1 >= 0.5;
  }

  // Tableau d'étoiles [1..5]
  get starsArray(): number[] { return [1, 2, 3, 4, 5]; }

  // Prix entier
  get priceInt(): number {
    const p = this.product.salePrice ?? this.product.price;
    return Math.floor(p);
  }

  // Centimes formatés
  get priceCentsStr(): string {
    const p = this.product.salePrice ?? this.product.price;
    return String(Math.round((p % 1) * 100)).padStart(2, '0');
  }

  onAddToCart(): void    { this.addToCart.emit(this.product); }
  onCardClick(): void    { this.cardClicked.emit(this.product); }

  onWishlist(): void {
    this.isInWishlist = !this.isInWishlist;
    this.wishlistToggled.emit(this.product);
  }
}