// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdcMpVjg7LwyIqfmo-4Ngt1T0izJi9Adc",
  authDomain: "ias2-5ca3c.firebaseapp.com",
  projectId: "ias2-5ca3c",
  storageBucket: "ias2-5ca3c.firebasestorage.app",
  messagingSenderId: "26556919240",
  appId: "1:26556919240:web:e1fe3f87ca122d455a64fd",
  measurementId: "G-X3752QLMKP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances to use across your app
export { app, analytics, auth, db };
export default app;