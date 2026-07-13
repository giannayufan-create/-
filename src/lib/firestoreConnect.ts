import { enableNetwork } from 'firebase/firestore';
import { db } from './firebase';

let connecting = false;
let connected = false;

export async function ensureFirestoreOnline(): Promise<void> {
  if (connected) return;
  if (connecting) {
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  connecting = true;
  try {
    await enableNetwork(db);
    connected = true;
  } catch {
    /* ignore */
  } finally {
    connecting = false;
  }
}

export function isOfflineError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  const msg = err?.message || '';
  return msg.includes('offline') || msg.includes('無法連線') || err?.code === 'unavailable';
}
