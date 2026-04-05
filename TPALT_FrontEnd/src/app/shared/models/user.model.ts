export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: string; // 'CLIENT' | 'ADMIN'
  addresses?: string[];
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Gardé pour compatibilité avec user.service.ts existant
export interface Wishlist {
  id: string;
  userId: string;
  bookIds: string[];
}