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
  userData: any | null;
  accessToken: string | null;
  cart: CartItem[];
  cartTotal: number;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  setUser: (user: User | null, role: 'admin' | 'member' | null, token: string | null, userData?: any) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  setProfileModalOpen: (isOpen: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  userRole: null,
  userData: null,
  accessToken: null,
  cart: [],
  cartTotal: 0,
  isAuthModalOpen: false,
  isProfileModalOpen: false,
  setUser: (user, role, token, userData) => set({ user, userRole: role, accessToken: token, userData }),
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
  clearCart: () => set({ cart: [], cartTotal: 0 }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  setProfileModalOpen: (isOpen) => set({ isProfileModalOpen: isOpen })
}));
