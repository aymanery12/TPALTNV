import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  searchQuery = '';
  cartCount = 0;
  showUserMenu = false;

  constructor(
      public authService: AuthService,
      private cartService: CartService,
      private router: Router,
      public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn().subscribe(status => {
      this.isLoggedIn = status;
      this.isAdmin = status ? this.authService.isAdmin() : false;
    });
    this.cartService.getItemCount().subscribe(count => {
      this.cartCount = count;
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/catalog'], {
        queryParams: { search: this.searchQuery.trim() }
      });
      this.searchQuery = '';
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onSearch();
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
    this.isAdmin = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }
}