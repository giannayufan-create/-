import { create } from 'zustand';
import { User } from 'firebase/auth';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface AppState {
  user: User | null;
  userRole: 'admin' | 'member' | null;
  accessToken: string | null;
  cart: CartItem[];
  cartTotal: number;
  setUser: (user: User | null, role: 'admin' | 'member' | null, token: string | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  userRole: null,
  accessToken: null,
  cart: [],
  cartTotal: 0,
  setUser: (user, role, token) => set({ user, userRole: role, accessToken: token }),
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(i => i.productId === item.productId);
    let newCart = [];
    if (existing) {
      newCart = state.cart.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i);
    } else {
      newCart = [...state.cart, item];
    }
    return { cart: newCart, cartTotal: newCart.reduce((total, i) => total + (i.price * i.quantity), 0) };
  }),
  removeFromCart: (productId) => set((state) => {
    const newCart = state.cart.filter(i => i.productId !== productId);
    return { cart: newCart, cartTotal: newCart.reduce((total, i) => total + (i.price * i.quantity), 0) };
  }),
  updateQuantity: (productId, quantity) => set((state) => {
    const newCart = state.cart.map(i => i.productId === productId ? { ...i, quantity } : i);
    return { cart: newCart, cartTotal: newCart.reduce((total, i) => total + (i.price * i.quantity), 0) };
  }),
  clearCart: () => set({ cart: [], cartTotal: 0 })
}));
