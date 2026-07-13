import { DEFAULT_SETTINGS } from './seed';
import { DEFAULT_PAGE_TEXTS, PageTexts } from './pageTexts';
import { SiteSettings } from '../types';

export type AppSettings = SiteSettings & { pageTexts: PageTexts };

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  pageTexts: DEFAULT_PAGE_TEXTS,
};

export function mergeSettings(data?: Partial<AppSettings>): AppSettings {
  const pageTexts = { ...DEFAULT_PAGE_TEXTS, ...data?.pageTexts };
  // 舊版結帳說明自動換成新文案
  const oldNotes = ['訂單已通知商家', '結帳後將寄送 Email 通知給您與商家'];
  if (oldNotes.includes(pageTexts.checkoutNote)) {
    pageTexts.checkoutNote = DEFAULT_PAGE_TEXTS.checkoutNote;
  }
  return {
    ...DEFAULT_APP_SETTINGS,
    ...data,
    pageTexts,
    carousel: data?.carousel?.length ? data.carousel : DEFAULT_SETTINGS.carousel,
    categoryOrder: data?.categoryOrder?.length ? data.categoryOrder : DEFAULT_SETTINGS.categoryOrder,
    subCategories: data?.subCategories || DEFAULT_SETTINGS.subCategories,
    categoryCardSizes: { ...DEFAULT_SETTINGS.categoryCardSizes, ...data?.categoryCardSizes },
    defaultCardSize: data?.defaultCardSize || DEFAULT_SETTINGS.defaultCardSize,
    paymentCashEnabled: data?.paymentCashEnabled ?? DEFAULT_SETTINGS.paymentCashEnabled,
    paymentTransferEnabled: data?.paymentTransferEnabled ?? DEFAULT_SETTINGS.paymentTransferEnabled,
    paymentCreditEnabled: data?.paymentCreditEnabled ?? DEFAULT_SETTINGS.paymentCreditEnabled,
    deliveryPersonalEnabled: data?.deliveryPersonalEnabled ?? DEFAULT_SETTINGS.deliveryPersonalEnabled,
  };
}
