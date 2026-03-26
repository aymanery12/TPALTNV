import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./orders-page/orders-page').then(m => m.OrdersPage)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)]
})
export class OrdersModule {}
