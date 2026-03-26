import { Book } from './book.model';

export interface CartItem {
  id: string;
  book: Book;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  lastUpdated: Date;
}
