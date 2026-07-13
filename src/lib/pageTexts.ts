export interface PageTexts {
  headerSubtitle: string;
  navMenu: string;
  navOrders: string;
  navAdmin: string;
  navCart: string;
  navMember: string;
  navLogin: string;
  featuredTitle: string;
  bestsellerTitle: string;
  searchPlaceholder: string;
  addToCartBtn: string;
  addSuccess: string;
  cartTitle: string;
  cartEmptyTitle: string;
  cartEmptyDesc: string;
  cartGoMenu: string;
  deliveryTitle: string;
  deliveryDateLabel: string;
  deliveryTimeLabel: string;
  checkoutBtn: string;
  checkoutNote: string;
  checkoutSuccessTitle: string;
  checkoutSuccessContact: string;
  ordersTitle: string;
  ordersEmpty: string;
  footerContact: string;
  footerBusiness: string;
  footerBusinessDesc1: string;
  footerBusinessDesc2: string;
  profileWelcome: string;
  profileWelcomeDesc: string;
  stockLabel: string;
  soldLabel: string;
  quantityLabel: string;
}

export const DEFAULT_PAGE_TEXTS: PageTexts = {
  headerSubtitle: '線上訂購',
  navMenu: '菜單',
  navOrders: '我的訂單',
  navAdmin: '管理後台',
  navCart: '購物車',
  navMember: '會員',
  navLogin: '登入',
  featuredTitle: '明星商品',
  bestsellerTitle: '熱銷排行',
  searchPlaceholder: '搜尋商品...',
  addToCartBtn: '加入購物車',
  addSuccess: '已成功加入購物車！',
  cartTitle: '購物車',
  cartEmptyTitle: '購物車是空的',
  cartEmptyDesc: '快去選購美味餐點吧！',
  cartGoMenu: '前往菜單',
  deliveryTitle: '選擇配送時間',
  deliveryDateLabel: '配送日期',
  deliveryTimeLabel: '配送時段',
  checkoutBtn: '確認結帳',
  checkoutNote: '結帳後商家會盡速為您安排送貨',
  checkoutSuccessTitle: '訂單已完成等待配送',
  checkoutSuccessContact: '有任何問題 請聯絡 滷味小哥路人甲',
  ordersTitle: '我的訂單',
  ordersEmpty: '尚無訂單紀錄',
  footerContact: '聯絡我們',
  footerBusiness: '配送資訊',
  footerBusinessDesc1: '送貨：新竹以北',
  footerBusinessDesc2: '不限金額配送',
  profileWelcome: '歡迎加入！',
  profileWelcomeDesc: '首次登入請填寫基本資料，才能開始訂購',
  stockLabel: '庫存',
  soldLabel: '已售',
  quantityLabel: '數量',
};

export const PAGE_TEXT_FIELDS: { key: keyof PageTexts; label: string; group: string }[] = [
  { key: 'headerSubtitle', label: '網站副標題', group: '導覽列' },
  { key: 'navMenu', label: '菜單', group: '導覽列' },
  { key: 'navOrders', label: '我的訂單', group: '導覽列' },
  { key: 'navAdmin', label: '管理後台', group: '導覽列' },
  { key: 'navCart', label: '購物車', group: '導覽列' },
  { key: 'navMember', label: '會員', group: '導覽列' },
  { key: 'navLogin', label: '登入按鈕', group: '導覽列' },
  { key: 'featuredTitle', label: '明星商品標題', group: '菜單頁' },
  { key: 'bestsellerTitle', label: '熱銷排行標題', group: '菜單頁' },
  { key: 'searchPlaceholder', label: '搜尋框提示', group: '菜單頁' },
  { key: 'quantityLabel', label: '數量標籤', group: '菜單頁' },
  { key: 'stockLabel', label: '庫存標籤', group: '菜單頁' },
  { key: 'soldLabel', label: '已售標籤', group: '菜單頁' },
  { key: 'addToCartBtn', label: '加入購物車按鈕', group: '菜單頁' },
  { key: 'addSuccess', label: '加入成功提示', group: '菜單頁' },
  { key: 'cartTitle', label: '購物車標題', group: '購物車' },
  { key: 'cartEmptyTitle', label: '購物車空標題', group: '購物車' },
  { key: 'cartEmptyDesc', label: '購物車空說明', group: '購物車' },
  { key: 'cartGoMenu', label: '前往菜單按鈕', group: '購物車' },
  { key: 'deliveryTitle', label: '配送時間標題', group: '購物車' },
  { key: 'deliveryDateLabel', label: '配送日期', group: '購物車' },
  { key: 'deliveryTimeLabel', label: '配送時段', group: '購物車' },
  { key: 'checkoutBtn', label: '確認結帳按鈕', group: '購物車' },
  { key: 'checkoutNote', label: '結帳說明', group: '購物車' },
  { key: 'checkoutSuccessTitle', label: '結帳成功標題', group: '購物車' },
  { key: 'checkoutSuccessContact', label: '結帳成功聯絡說明', group: '購物車' },
  { key: 'ordersTitle', label: '我的訂單標題', group: '訂單頁' },
  { key: 'ordersEmpty', label: '無訂單提示', group: '訂單頁' },
  { key: 'footerContact', label: '頁尾－聯絡我們', group: '頁尾' },
  { key: 'footerBusiness', label: '頁尾－營業資訊', group: '頁尾' },
  { key: 'footerBusinessDesc1', label: '頁尾－說明一', group: '頁尾' },
  { key: 'footerBusinessDesc2', label: '頁尾－說明二', group: '頁尾' },
  { key: 'profileWelcome', label: '首次登入標題', group: '會員註冊' },
  { key: 'profileWelcomeDesc', label: '首次登入說明', group: '會員註冊' },
];
