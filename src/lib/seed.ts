import { DEFAULT_SUB_CATEGORIES } from './constants';
import { DEFAULT_PAGE_TEXTS } from './pageTexts';

export const SAMPLE_PRODUCTS = [
  { name: '爆漿貢丸', description: '彈牙多汁，火鍋必備經典，10 顆裝', price: 85, stock: 50, category: '火鍋料', subCategory: '丸類', isFeatured: true, sortOrder: 1 },
  { name: '百頁豆腐', description: '吸湯入味，口感綿密', price: 45, stock: 80, category: '火鍋料', subCategory: '豆製品', isFeatured: false, sortOrder: 2 },
  { name: '雪花牛肉片', description: '油花均勻，涮煮 10 秒即可', price: 280, stock: 30, category: '火鍋料', subCategory: '肉片', isFeatured: true, sortOrder: 3 },
  { name: '鮮蝦仁水餃', description: '整隻鮮蝦入餡，12 顆裝', price: 120, stock: 40, category: '水餃', subCategory: '海鮮', isFeatured: true, sortOrder: 1 },
  { name: '高麗菜豬肉水餃', description: '傳統手工，20 顆裝', price: 90, stock: 60, category: '水餃', subCategory: '豬肉', isFeatured: false, sortOrder: 2 },
  { name: '韭菜鮮肉水餃', description: '韭菜香氣十足，20 顆裝', price: 95, stock: 55, category: '水餃', subCategory: '豬肉', isFeatured: false, sortOrder: 3 },
  { name: '滷味綜合拼盤', description: '豆干、海帶、滷蛋、貢丸', price: 150, stock: 25, category: '滷味', subCategory: '滷味套餐', isFeatured: true, sortOrder: 1 },
  { name: '招牌滷豆干', description: '滷汁滲透入味，Q 彈有嚼勁', price: 40, stock: 70, category: '滷味', subCategory: '滷味配餐', isFeatured: false, sortOrder: 2 },
  { name: '香滷雞翅', description: '慢火滷製，每份 6 支', price: 110, stock: 35, category: '滷味', subCategory: '滷味主菜', isFeatured: false, sortOrder: 3 },
];

export const DEFAULT_SETTINGS = {
  storeName: '滷味小哥路人甲',
  storePhone: '0900-130-271',
  storeAddress: '桃園市桃園區',
  storeDescription: '精選火鍋料、手工水餃、經典滷味，新鮮直送。',
  adminEmail: 'ko520940@gmail.com',
  web3formsAccessKey: '',
  spreadsheetId: '',
  minOrderAmount: 0,
  lineId: '@滷味小哥',
  lineUrl: 'https://line.me',
  facebookUrl: '',
  bgMusicUrl: '',
  bgMusicEnabled: false,
  bgMusicVolume: 40,
  textScale: 110,
  pageTexts: DEFAULT_PAGE_TEXTS,
  carousel: [
    { image: '', title: '新鮮火鍋料直送', subtitle: '每日現撈，品質保證' },
    { image: '', title: '手工水餃', subtitle: '皮薄餡多，真材實料' },
    { image: '', title: '經典滷味', subtitle: '滷汁入味，回味無窮' },
  ],
  footerText: '感謝您的支持！送貨新竹以北，不限金額配送。如有問題歡迎 LINE 聯繫我們！',
  categoryOrder: ['火鍋料', '水餃', '滷味'],
  subCategories: DEFAULT_SUB_CATEGORIES,
};
