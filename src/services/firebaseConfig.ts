// Import the functions you need from the SDKs you need
import { Platform } from "react-native";
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Used from google-services.json or Environment Variables (EAS Build / .env)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with Persistence
let auth: any;
if (Platform.OS === 'web') {
  // On web, getAuth() uses browserLocalPersistence by default
  auth = getAuth(app); 
} else {
  if (getApps().length === 0) {
     // @ts-ignore
     auth = initializeAuth(app, {
        // @ts-ignore
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
     });
  } else {
     // If app was already initialized, auth might be too, try to get it
     try {
       // @ts-ignore
       auth = initializeAuth(app, {
          // @ts-ignore
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
let db: any;
if (Platform.OS === 'web') {
    db = getFirestore(app);
} else {
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
}


export { db };

export default app;
