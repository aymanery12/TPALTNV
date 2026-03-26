import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core';
import { Order } from '../../shared/models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Navbar, Footer],
  templateUrl: './user-profile-page.html',
  styleUrl: './user-profile-page.scss'
})
export class UserProfilePage implements OnInit {
  username = '';
  role     = '';
  orders: Order[] = [];
  isLoading = true;
  activeTab: 'info' | 'orders' = 'info';

  constructor(
      private authService: AuthService,
      private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() ?? 'Utilisateur';
    this.role     = this.authService.getRole() ?? 'CLIENT';
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders   = orders;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      EN_PREPARATION: 'En préparation',
      EXPEDIEE:       'Expédiée',
      LIVREE:         'Livrée'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      EN_PREPARATION: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      EXPEDIEE:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
      LIVREE:         'bg-green-500/20 text-green-300 border-green-500/30'
    };
    return map[status] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }

  getInitial(): string {
    return this.username.charAt(0).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}