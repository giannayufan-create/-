import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { ensureFirestoreOnline, isOfflineError } from './firestoreConnect';
import { extractRegion } from './constants';
import { ADMIN_EMAILS, UserProfile } from '../types';

async function firestoreGet(ref: DocumentReference) {
  await ensureFirestoreOnline();
  return await getDoc(ref);
}

async function firestoreSet(ref: DocumentReference, data: object) {
  await ensureFirestoreOnline();
  await setDoc(ref, data);
}

const PROFILE_CACHE_PREFIX = 'profile_v1_';

export function cacheUserProfile(profile: UserProfile) {
  try {
    localStorage.setItem(PROFILE_CACHE_PREFIX + profile.uid, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export function getCachedUserProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_PREFIX + uid);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function buildFallbackProfile(authUser: User): UserProfile {
  const email = (authUser.email || '').toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);
  const now = new Date().toISOString();
  return {
    uid: authUser.uid,
    role: isAdmin ? 'admin' : 'member',
    name: authUser.displayName || '',
    email: authUser.email || '',
    phone: '',
    billingAddress: '',
    shippingAddress: '',
    region: '其他',
    level: '一般',
    points: 0,
    isProfileComplete: false,
    provider: authUser.providerData[0]?.providerId || 'password',
    createdAt: now,
    updatedAt: now,
  };
}

export async function ensureUserProfile(authUser: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', authUser.uid);
  const snap = await firestoreGet(userRef);
  const email = (authUser.email || '').toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);
  const provider = authUser.providerData[0]?.providerId || 'password';
  const now = new Date().toISOString();

  if (!snap.exists()) {
    const newProfile: UserProfile = {
      uid: authUser.uid,
      role: isAdmin ? 'admin' : 'member',
      name: authUser.displayName || '',
      email: authUser.email || '',
      phone: '',
      billingAddress: '',
      shippingAddress: '',
      region: '其他',
      level: '一般',
      points: 0,
      isProfileComplete: false,
      provider,
      createdAt: now,
      updatedAt: now,
    };
    await firestoreSet(userRef, newProfile);
    cacheUserProfile(newProfile);
    return newProfile;
  }

  const data = snap.data() as UserProfile;
  let role = data.role || 'member';
  const hasRequiredFields = Boolean(data.name?.trim() && data.phone?.trim() && data.shippingAddress?.trim());
  let isProfileComplete = data.isProfileComplete === true || hasRequiredFields;
  if (isAdmin) isProfileComplete = true;

  const profile: UserProfile = {
    ...data,
    uid: authUser.uid,
    email: data.email || authUser.email || '',
    role,
    isProfileComplete,
  };

  if (isAdmin && role !== 'admin') {
    role = 'admin';
    profile.role = 'admin';
    await updateDoc(userRef, { role: 'admin', isProfileComplete: true, updatedAt: now });
  }

  if (hasRequiredFields && data.isProfileComplete !== true) {
    await updateDoc(userRef, { isProfileComplete: true, updatedAt: now });
    profile.isProfileComplete = true;
  }

  if (isAdmin && !data.isProfileComplete) {
    await updateDoc(userRef, { isProfileComplete: true, updatedAt: now });
  }

  cacheUserProfile(profile);
  return profile;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'billingAddress' | 'shippingAddress'>>
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    region: extractRegion(updates.shippingAddress || ''),
    isProfileComplete: true,
    updatedAt: now,
  };

  try {
    const snap = await firestoreGet(userRef);

    if (!snap.exists()) {
      const newProfile: UserProfile = {
        uid,
        role: 'member',
        name: updates.name || '',
        email: '',
        phone: updates.phone || '',
        billingAddress: updates.billingAddress || '',
        shippingAddress: updates.shippingAddress || '',
        region: extractRegion(updates.shippingAddress || ''),
        level: '一般',
        points: 0,
        isProfileComplete: true,
        provider: 'password',
        createdAt: now,
        updatedAt: now,
      };
      await firestoreSet(userRef, newProfile);
      cacheUserProfile(newProfile);
      return newProfile;
    }

    await updateDoc(userRef, payload);
    const updated = { ...(snap.data() as UserProfile), ...payload };
    cacheUserProfile(updated);
    return updated;
  } catch (e) {
    if (isOfflineError(e)) {
      throw new Error('無法連線資料庫。請到 Firebase Console 建立 Firestore 資料庫後重試');
    }
    throw e;
  }
}

export function applyLocalProfile(
  current: UserProfile,
  updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'billingAddress' | 'shippingAddress'>>
): UserProfile {
  return {
    ...current,
    ...updates,
    region: extractRegion(updates.shippingAddress || current.shippingAddress || ''),
    isProfileComplete: true,
    updatedAt: new Date().toISOString(),
  };
}
