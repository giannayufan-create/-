import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider,
  OAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, User, sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const yahooProvider = new OAuthProvider('yahoo.com');

let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) cachedAccessToken = credential.accessToken;
  return result;
};

export const googleSignInWithScopes = async () => {
  const adminProvider = new GoogleAuthProvider();
  adminProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
  adminProvider.addScope('https://www.googleapis.com/auth/gmail.send');
  const result = await signInWithPopup(auth, adminProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) cachedAccessToken = credential.accessToken;
  return result;
};

export const facebookSignIn = () => signInWithPopup(auth, facebookProvider);
export const yahooSignIn = () => signInWithPopup(auth, yahooProvider);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const getAccessToken = () => cachedAccessToken;

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
