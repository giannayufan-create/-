import { DEFAULT_SETTINGS } from './seed';
import { DEFAULT_PAGE_TEXTS, PageTexts } from './pageTexts';
import { SiteSettings } from '../types';

export type AppSettings = SiteSettings & { pageTexts: PageTexts };

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  pageTexts: DEFAULT_PAGE_TEXTS,
};

export function mergeSettings(data?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...data,
    pageTexts: { ...DEFAULT_PAGE_TEXTS, ...data?.pageTexts },
    carousel: data?.carousel?.length ? data.carousel : DEFAULT_SETTINGS.carousel,
    categoryOrder: data?.categoryOrder?.length ? data.categoryOrder : DEFAULT_SETTINGS.categoryOrder,
    subCategories: data?.subCategories || DEFAULT_SETTINGS.subCategories,
  };
}
