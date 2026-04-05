import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./user-profile-page').then(m => m.UserProfilePage)
  },
  {
    path: 'wishlist',
    canActivate: [authGuard],
    loadComponent: () => import('./wishlist/wishlist-page').then(m => m.WishlistPage)
  }
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class UserProfileModule {}