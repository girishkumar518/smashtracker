// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Used from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyDj61VZkUrNNFYfuxlGo-dlqZFbLrbrzV0",
  authDomain: "smashtracker-3a044.firebaseapp.com",
  projectId: "smashtracker-3a044",
  storageBucket: "smashtracker-3a044.firebasestorage.app",
  messagingSenderId: "444345343511",
  appId: "1:444345343511:android:1cf67c1024fd2c6408c652"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Use initializeFirestore to optimize settings for React Native
// Using experimentalForceLongPolling as it is often more reliable on Android
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export default app;
