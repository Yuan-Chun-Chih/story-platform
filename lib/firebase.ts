import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isConfigValid = Object.entries(firebaseConfig).every(
  ([key, value]) => {
    if (!value) {
      console.error(`[firebase] Missing env: ${key}`);
      return false;
    }
    return true;
  }
);

if (!isConfigValid) {
  throw new Error(
    "Firebase 用戶端設定缺少環境變數 (NEXT_PUBLIC_FIREBASE_*). 請在 .env.local 填入對應值後重新啟動。"
  );
}

export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

let analyticsPromise: Promise<void> | null = null;

export const initAnalytics = () => {
  if (typeof window === "undefined") return null;
  if (!analyticsPromise) {
    analyticsPromise = analyticsSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    });
  }
  return analyticsPromise;
};
