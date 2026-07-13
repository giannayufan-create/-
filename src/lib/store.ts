import { create } from 'zustand';
import { User } from 'firebase/auth';
import { CartItem, UserProfile, UserRole } from '../types';

const CART_KEY = 'luwu_cart_v1';

function loadCart(): { cart: CartItem[]; cartTotal: number } {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { cart: [], cartTotal: 0 };
    const cart = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(cart)) return { cart: [], cartTotal: 0 };
    return { cart, cartTotal: cart.reduce((t, i) => t + i.price * i.quantity, 0) };
  } catch {
    return { cart: [], cartTotal: 0 };
  }
}

function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch { /* ignore */ }
}

const initialCart = loadCart();

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
  cart: initialCart.cart,
  cartTotal: initialCart.cartTotal,
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
      saveCart(newCart);
      return {
        cart: newCart,
        cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0),
        cartPulse: true,
      };
    }),
  removeFromCart: (productId) =>
    set((state) => {
      const newCart = state.cart.filter((i) => i.productId !== productId);
      saveCart(newCart);
      return { cart: newCart, cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0) };
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => {
      const qty = Math.max(1, Math.floor(quantity) || 1);
      const newCart = state.cart.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i));
      saveCart(newCart);
      return { cart: newCart, cartTotal: newCart.reduce((t, i) => t + i.price * i.quantity, 0) };
    }),
  clearCart: () => {
    saveCart([]);
    set({ cart: [], cartTotal: 0 });
  },
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  setProfileModalOpen: (isOpen) => set({ isProfileModalOpen: isOpen }),
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  clearCartPulse: () => set({ cartPulse: false }),
}));
