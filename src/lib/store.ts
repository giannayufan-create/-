import { create } from 'zustand';
import { User } from 'firebase/auth';
import { CartItem, UserProfile, UserRole } from '../types';

interface AppState {
  user: User | null;
  userRole: UserRole | null;
  userData: UserProfile | null;
  accessToken: string | null;
  cart: CartItem[];
  cartTotal: number;
  isAuthLoading: boolean;
  isSigningIn: boolean;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  isProfileReady: boolean;
  cartPulse: boolean;
  setUser: (user: User | null, role: UserRole | null, token: string | null, userData?: UserProfile | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  setSigningIn: (isSigningIn: boolean) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  setProfileModalOpen: (isOpen: boolean) => void;
  setProfileReady: (ready: boolean) => void;
  clearCartPulse: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  userRole: null,
  userData: null,
  accessToken: null,
  cart: [],
  cartTotal: 0,
  isAuthLoading: true,
  isSigningIn: false,
  isAuthModalOpen: false,
  isProfileModalOpen: false,
  isProfileReady: false,
  cartPulse: false,
  setUser: (user, role, token, userData) =>
    set({ user, userRole: role, accessToken: token, userData: userData ?? null, isAuthLoading: false, isSigningIn: false }),
  setAuthLoading: (isLoading) => set({ isAuthLoading: isLoading }),
  setSigningIn: (isSigningIn) => set({ isSigningIn }),
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((i) => i.productId === item.productId);
      const newCart = existing
        ? state.cart.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...state.cart, item];
      return {
        cart: newCart,
        cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0),
        cartPulse: true,
      };
    }),
  removeFromCart: (productId) =>
    set((state) => {
      const newCart = state.cart.filter((i) => i.productId !== productId);
      return { cart: newCart, cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0) };
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => {
      const newCart = state.cart.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      return { cart: newCart, cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0) };
    }),
  clearCart: () => set({ cart: [], cartTotal: 0 }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  setProfileModalOpen: (isOpen) => set({ isProfileModalOpen: isOpen }),
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  clearCartPulse: () => set({ cartPulse: false }),
}));
