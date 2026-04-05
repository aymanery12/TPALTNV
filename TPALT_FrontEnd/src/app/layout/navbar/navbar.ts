import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';

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
  showGuestMenu = false;
  showUserMenu = false;
  sidebarOpen = false;
  username = '';
  currentLang: 'fr' | 'en' = 'fr';
  @ViewChild('guestMenuWrapper') guestMenuWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('userMenuWrapper') userMenuWrapper?: ElementRef<HTMLDivElement>;

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  constructor(
      public authService: AuthService,
      private cartService: CartService,
      private router: Router,
      public themeService: ThemeService,
      public languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.currentLanguage;
    this.authService.isLoggedIn().subscribe(status => {
      this.isLoggedIn = status;
      this.isAdmin = status ? this.authService.isAdmin() : false;
      this.username = status ? (this.authService.getUsername() ?? '') : '';
      if (status) {
        this.showGuestMenu = false;
      } else {
        this.showUserMenu = false;
      }
    });
    this.languageService.currentLanguageChanges().subscribe(lang => {
      this.currentLang = lang;
    });
    this.cartService.getItemCount().subscribe(count => {
      this.cartCount = count;
    });
  }

  get greetingLabel(): string {
    const base = this.languageService.t('navbar.guestGreeting');
    return this.isLoggedIn && this.username ? `${base} ${this.username}` : `${base} !`;
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  translateCategory(category: string): string {
    return this.languageService.categoryLabel(category);
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
    this.showGuestMenu = false;
    this.showUserMenu = !this.showUserMenu;
  }

  toggleGuestMenu(): void {
    this.showUserMenu = false;
    this.showGuestMenu = !this.showGuestMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  closeGuestMenu(): void {
    this.showGuestMenu = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (this.showUserMenu && this.userMenuWrapper?.nativeElement && target && !this.userMenuWrapper.nativeElement.contains(target)) {
      this.showUserMenu = false;
    }

    if (this.showGuestMenu && this.guestMenuWrapper?.nativeElement && target && !this.guestMenuWrapper.nativeElement.contains(target)) {
      this.showGuestMenu = false;
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.showGuestMenu) {
      this.showGuestMenu = false;
    }

    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
  }
}