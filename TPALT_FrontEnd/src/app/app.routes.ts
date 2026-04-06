import { Routes } from '@angular/router';
import { LoginPage } from './features/auth/login-page/login-page';
import { AdminDashboardComponent } from './features/admin/admin-dashboard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadChildren: () =>
        import('./features/home/home-module').then(m => m.HomeModule)
  },
  {
    path: 'catalog',
    loadChildren: () =>
        import('./features/catalog/catalog.module').then(m => m.CatalogModule)
  },
  {
    path: 'books/:id',
    loadChildren: () =>
        import('./features/book-details/book-details.module').then(m => m.BookDetailsModule)
  },
  {
    path: 'login',
    component: LoginPage
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'profile',
    loadChildren: () =>
        import('./features/user-profile/user-profile.module').then(m => m.UserProfileModule)
  },
  {
    path: 'cart',
    loadChildren: () =>
        import('./features/cart/cart-module').then(m => m.CartModule)
  },
  {
    path: 'orders',
    loadChildren: () =>
        import('./features/orders/orders-module').then(m => m.OrdersModule)
  },
  // Redirects
  { path: 'books', redirectTo: 'catalog', pathMatch: 'full' },
  { path: 'products', redirectTo: 'catalog', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];