export interface Book {
  id: number;
  title: string;
  author: string[] | null;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  rating: number;

  // Champs utilisés par le frontend (optionnels)
  coverImageUrl?: string;
  authors?: { id: string; name: string }[];
  reviewCount?: number;
  discount?: number;
  inStock?: boolean;
}

export interface BookReview {
  id: number;
  rating: number;
  comment: string;
  book?: Book;
  user?: { id: number; username: string };
}