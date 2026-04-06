import { Book } from './book.model';

export interface OrderItem {
  id?: number;
  book: Book;
  quantity: number;
  price: number;
}

export interface Order {
  id?: number;
  user?: { id: number; username: string };
  items: OrderItem[];
  totalAmount?: number;
  status?: string; // 'EN_PREPARATION' | 'EXPEDIEE' | 'LIVREE'
  shippingAddress: string;
  paymentMethod?: string; // 'COD'
  orderDate?: string;
  trackingNumber?: string;
}