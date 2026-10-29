import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBzuemX6dz9hibdmi_l409MTRWlk7zxlzE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "his-and-hers-121b8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "his-and-hers-121b8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "his-and-hers-121b8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "760163057774",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:760163057774:web:4dda83c00415626b6c667f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GTCWVV3QTP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
