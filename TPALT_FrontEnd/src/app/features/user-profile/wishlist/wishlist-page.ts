import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../../../layout/navbar/navbar';
import { Footer } from '../../../layout/footer/footer';
import { Book } from '../../../shared/models';
import { WishlistService } from '../../../core/services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.scss'
})
export class WishlistPage implements OnInit {
  wishlist: Book[] = [];

  constructor(private wishlistService: WishlistService) {}

  ngOnInit(): void {
    this.wishlistService.getWishlist().subscribe(books => {
      this.wishlist = books;
    });
  }

  removeFromWishlist(book: Book): void {
    this.wishlistService.remove(book);
  }

  clearWishlist(): void {
    this.wishlistService.clear();
  }
}
