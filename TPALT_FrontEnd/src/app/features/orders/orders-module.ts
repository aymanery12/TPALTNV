import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./orders-page/orders-page').then(m => m.OrdersPage)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)]
})
export class OrdersModule {}
