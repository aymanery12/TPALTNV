import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-profile-page').then(m => m.UserProfilePage)
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./wishlist/wishlist-page').then(m => m.WishlistPage)
  }
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class UserProfileModule {}