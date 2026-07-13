import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureSettingsLoaded,
  getSettingsSnapshot,
  isSettingsLoaded,
  loadSettings,
  subscribeSettings,
  setSettingsCache,
} from './settingsCache';

export type { AppSettings } from './settingsData';
export { DEFAULT_APP_SETTINGS, mergeSettings } from './settingsData';
export { setSettingsCache, loadSettings };

export function useSiteSettings() {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsSnapshot
  );

  useEffect(() => {
    void loadSettings();
  }, []);

  return {
    settings,
    loading: !isSettingsLoaded(),
    texts: settings.pageTexts,
  };
}
