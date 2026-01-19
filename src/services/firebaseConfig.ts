// Import the functions you need from the SDKs you need
import { Platform } from "react-native";
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with Persistence
let auth;
if (Platform.OS === 'web') {
  // On web, getAuth() uses browserLocalPersistence by default
  auth = getAuth(app); 
} else {
  if (getApps().length === 0) {
     auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
     });
  } else {
     // If app was already initialized, auth might be too, try to get it
     try {
       auth = initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage)
       });
     } catch (e) {
       auth = getAuth(app);
     }
  }
}

export { auth };

// Initialize Firestore
// Use initializeFirestore to optimize settings for React Native
// Using experimentalForceLongPolling as it is often more reliable on Android
let db;
if (Platform.OS === 'web') {
    db = getFirestore(app);
} else {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
}

export { db };

export default app;
