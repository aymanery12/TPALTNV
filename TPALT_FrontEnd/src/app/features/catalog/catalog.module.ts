import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () => import('./book-list/book-list').then(m => m.BookList)
      },
      {
        path: 'search',
        loadComponent: () => import('./book-list/book-list').then(m => m.BookList)
      }
    ]
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class CatalogModule {}
