export type Category =
  | "Coffee & Hot Beverages"
  | "Cold Beverages"
  | "Fresh Juices & Smoothies"
  | "Wraps & Rolls"
  | "Maggi & Noodles"
  | "Quick Bites";

export interface MenuItem {
  id: number;
  name: string;
  price: number; // in INR
  category: Category;
  image?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;           // e.g., "ORD-2025-08-15-123456"
  timestamp: number;    // Date.now()
  items: CartItem[];    // quantities included
  subtotal: number;
  tax: number;
  total: number;
}
