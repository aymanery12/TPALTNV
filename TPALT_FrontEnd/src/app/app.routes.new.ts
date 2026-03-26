import { Routes } from '@angular/router';

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
    path: 'cart',
    loadChildren: () =>
      import('./features/cart/cart-module').then(m => m.CartModule)
  },
  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.module').then(m => m.CheckoutModule)
  },
  {
    path: 'orders',
    loadChildren: () =>
      import('./features/orders/orders-module').then(m => m.OrdersModule)
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('./features/user-profile/user-profile.module').then(m => m.UserProfileModule)
  },
  // Legacy route redirect for backward compatibility
  {
    path: 'products',
    redirectTo: 'catalog',
    pathMatch: 'full'
  },
  { path: '**', redirectTo: 'home' }
];
