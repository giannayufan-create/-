export type UserRole = 'admin' | 'member';
export type OrderStatus = 'pending' | 'processing' | 'processed' | 'cancelled';
export type MemberLevel = '一般' | '銀卡' | '金卡' | 'VIP';
import type { PageTexts } from '../lib/pageTexts';

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  region: string;
  level: MemberLevel;
  points: number;
  /** 收藏／喜歡的商品 ID */
  favorites: string[];
  isProfileComplete: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  subCategory: string;
  sortOrder: number;
  isFeatured: boolean;
  salesCount: number;
  imageBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  billingAddress: string;
  shippingAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CarouselSlide {
  image: string;
  title: string;
  subtitle: string;
}

/** 前台商品卡片尺寸（4 種，依大類統一套用） */
export type CardSizeId = 'S' | 'M' | 'L' | 'XL';

export interface CardSizePreset {
  id: CardSizeId;
  label: string;
  imageHeight: number; // px
  titleSize: string;
}

export const CARD_SIZE_PRESETS: CardSizePreset[] = [
  { id: 'S', label: '小', imageHeight: 120, titleSize: '13px' },
  { id: 'M', label: '中', imageHeight: 160, titleSize: '15px' },
  { id: 'L', label: '大', imageHeight: 200, titleSize: '16px' },
  { id: 'XL', label: '特大', imageHeight: 240, titleSize: '17px' },
];

export interface SiteSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeDescription: string;
  adminEmail: string;
  web3formsAccessKey: string;
  spreadsheetId: string;
  minOrderAmount: number;
  lineId: string;
  lineUrl: string;
  facebookUrl: string;
  bgMusicUrl: string;
  bgMusicEnabled: boolean;
  bgMusicVolume: number;
  textScale: number;
  carousel: CarouselSlide[];
  footerText: string;
  categoryOrder: string[];
  subCategories: Record<string, string[]>;
  /** 各大類對應的卡片尺寸 */
  categoryCardSizes: Record<string, CardSizeId>;
  /** 未指定大類時的預設尺寸 */
  defaultCardSize: CardSizeId;
  pageTexts: PageTexts;
}


export const ADMIN_EMAILS = ['giannayufan@gmail.com', 'ko520940@gmail.com'];
export const MAIN_CATEGORIES = ['火鍋料', '水餃', '滷味'];
export const CATEGORIES = ['全部', ...MAIN_CATEGORIES] as const;
export const MEMBER_LEVELS: MemberLevel[] = ['一般', '銀卡', '金卡', 'VIP'];
export const TAIWAN_REGIONS = ['全部', '北部', '中部', '南部', '東部', '離島', '其他'];
