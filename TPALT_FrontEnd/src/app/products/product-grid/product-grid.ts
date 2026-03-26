import { Component, Input, OnChanges } from '@angular/core';
import { Product } from '../products-module';
import { CommonModule } from '@angular/common';
import { ProductCard } from '../product-card/product-card';


@Component({
  selector: "app-product-grid",
  imports: [CommonModule, ProductCard],
  templateUrl: "./product-grid.html",
  styleUrl: "./product-grid.scss",
})
export class ProductGrid implements OnChanges {
  @Input() sort: string = 'featured';

  products: Product[] = [
    {
      id: 1,
      title: 'The Art of UI Design: Principles for Modern Interfaces',
      author: 'Elena Rodriguez',
      price: 29,
      priceCents: 99,
      badge: 'BEST_SELLER',
      rating: 4.5,
      ratingsCount: '1,248',
      subtitle: 'FREE Delivery Tomorrow',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa_R2Q56I8XysoUfDHMGwVThWAPB-Fx1aU32rozeuXKFjdwtIgZcm4wa8xEApyM4qk0qAjFWUBysPJjNRMRkrIqFj6ExlaO3_rCuH5mf2qxXHAkYE8y_MpGSxGzrKDNgM8wPO5OBlqlfU-ryIMXa47jaXfFKly5h02CAUp_t4ECEhVyxgxbX3SLbYaTQRXuK4Y5LJ26Y6f9Mj7hiSzpoBvt3v7XMHk9LM1e6lAZWmdMkcD7sqqwOQ-5F8ItdOv07j9OOpN5qGugKRY'
    },
    {
      id: 2,
      title: 'Modern Web Architecture: From Monoliths to Microservices',
      author: 'David Chen',
      price: 34,
      priceCents: 50,
      rating: 5,
      ratingsCount: '852',
      subtitle: 'Prime Member Deal',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA4uZerAw-HSK9imeNnixr8zuIvVOWTFyT7xfoBcQUNG1wp-5S7m4X8rWOoYjwiLliEsiYxFPaL2KqaYXdk7Oabv6NPccx4wMX7drzMrifU4LcrVsathbzy9UpYz15wjdf2Dz_CVGOCWKwgDVYSeDbtQWlCwTSrZRmEJcq6fcn09Q9YjBN1iaf-PWIhTfP6XegrihedFhBXyqVJg_KxVcUptvKXhjW-cljTL_wM8g4tbfL0y_SaV5jHpmv6uVpkW0wAnuxxDF0KW-2L'
    },
    {
      id: 3,
      title: 'Classic Literature Vol. 1: The Essential Collection',
      author: 'Various Authors',
      price: 19,
      priceCents: 0,
      rating: 4,
      ratingsCount: '2,105',
      subtitle: 'List: €24.99',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDyKa0yJrP-ApcsSRPAR6G79BxdF1J6rnOHkdO6vYUyuj0V47V48ETbY6D-eZO6g-uTaGN1Eq9tEGoLyChZssJusBDTGjjAZQBI1hOZdruC19hvl7DFBjq_f5_bAy7ww38ea2FtdQr1D_prtI6q4c5PnE4Tjt1B7S34aGO48_-QXJ2r1fILD5grg_V5PnmZ6SpW69iV6rtM-eDy3vw_kgVNUZ-YkC6BVim3gVnldtZMSlccc0RzG58vhEf81IFTfeMDRMopZww30qIr'
    },
    {
      id: 4,
      title: 'Data Science Essentials with Python and SQL',
      author: 'Dr. Sarah J. Miller',
      price: 42,
      priceCents: 0,
      badge: 'SALE',
      salePercent: 20,
      listPrice: 52.5,
      rating: 4,
      ratingsCount: '452',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCYKpXcEPZAQRj8sDLzlwaE97lFuVVCaC5iVIsrGxdZuj64r4zErp4nKdejQWGSrXEWJGzKdi-OGLgS0bwpznqd70PJqocYQImadFz_wC5vYb1e7vkrQksC3lhHVuGhT8izRonAxw3ojx0ZVAnnCPnPtWTSF6PJ4KinlF2x-XKB9EBPfaSb4hav5sjjApHgFnCeKEs-6FvCN-Qq_8ueDuS_TjHBFUt30mHpundLbP0yB8T_nkA2VG2QDnZBofy2jL5ghhXGG4bYLrGt'
    },
    {
      id: 5,
      title: 'The History of Computing: A Visual Timeline',
      author: 'Marcus Thorne',
      price: 25,
      priceCents: 99,
      rating: 5,
      ratingsCount: '310',
      subtitle: 'Hardcover Edition',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBzneJPLw1BXYEVmnXrz3fZv5-GVySPuAxQYAqHOceI8dXQwCqtbhtO9cWNDn8Yt5-wJ3O5sTQgM2kmDuaSYe14a3dULdRl71DQmLy_klg1H5llzkceuk6FWsIscMZjiD9y_5YaJPz1vfrTma4vDB5e2FsgoJikgNSZm_e6Sg3Ha9Lq7LBamx2QDxND6Z2FE0iCcq35Sufpi2QU9daFMhpPgLwwFjqjwRhlS1SBof4_odVZYAiaVlLwUu__JGyrr4hKduU5G_8CabbP'
    },
    {
      id: 6,
      title: 'Creative Writing Guide: Unlock Your Inner Author',
      author: 'Julianne West',
      price: 15,
      priceCents: 0,
      rating: 4,
      ratingsCount: '154',
      subtitle: 'Kindle Available',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCGUj1xAZhX_4quKlpeZ0D_rSk4C_D0UA9WhqLcaBL3KEoeelY2T57xxPk5yu-OXpVQfn79vBtVsqTT5pgQEnkkQX7ckYomdoKpbcexsClaRE2tc6QW4NK7L_46f-UJVKBOLGBNA7RSR6Cq3lJIvITx9XWW0tt6zfa0BKIqEvkEEHGhejGz6fNREgE18MsQeka5NKC7pEunxhs9k7dOQR96tSJ4UWAjMuE-OdoQSAL-ofs29oOBvsBCAv0jgYekhq6frGo8FG4QX6hu'
    }
  ];

  ngOnChanges(): void {
    // later: sort this.products according to this.sort
  }

  onCardAddToCart(product: Product): void {
    console.log('Add to cart', product);
  }
}
