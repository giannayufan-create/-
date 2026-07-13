import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AppSettings, DEFAULT_APP_SETTINGS, mergeSettings } from './settingsData';

let cached: AppSettings = DEFAULT_APP_SETTINGS;
let loaded = false;
let loading: Promise<AppSettings> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** 用單次 getDoc 讀取設定，不建立 snapshot 監聽，避免 Target ID 衝突 */
export function loadSettings(force = false): Promise<AppSettings> {
  if (!force && loading) return loading;
  loading = getDoc(doc(db, 'settings', 'global'))
    .then((snap) => {
      cached = mergeSettings(snap.exists() ? (snap.data() as Partial<AppSettings>) : undefined);
      loaded = true;
      notify();
      return cached;
    })
    .catch((err) => {
      console.warn('設定讀取失敗，使用預設值:', err);
      loaded = true;
      loading = null;
      return cached;
    });
  return loading;
}

export function ensureSettingsLoaded() {
  if (!loaded && !loading) void loadSettings();
}

export function getSettingsSnapshot(): AppSettings {
  return cached;
}

export function isSettingsLoaded() {
  return loaded;
}

export function subscribeSettings(listener: () => void): () => void {
  ensureSettingsLoaded();
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}

export function setSettingsCache(data: AppSettings) {
  cached = data;
  loaded = true;
  notify();
}
