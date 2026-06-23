import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfssjj0TxgCLkA9PEBPXmtSM5wafV9s90",
  authDomain: "massareef-af374.firebaseapp.com",
  projectId: "massareef-af374",
  storageBucket: "massareef-af374.firebasestorage.app",
  messagingSenderId: "702480678464",
  appId: "1:702480678464:android:0c30339c6ca958470069a5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
