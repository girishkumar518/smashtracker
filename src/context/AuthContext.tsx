import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { User } from '../models/types';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In (Native Only)
    if (Platform.OS !== 'web') {
      try {
        GoogleSignin.configure({
          webClientId: '444345343511-minptmaffa165qb3vbv4f9j0sk4nb58h.apps.googleusercontent.com', 
        });
      } catch (e) {
        console.error("Google Signin Config Error:", e);
      }
    }

    // Real Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Prepare User Data
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
        };

        // Sync with Firestore "users" collection (Non-blocking background)
        setUser(userData);
        if (firebaseUser.displayName) { 
           // Fire and forget sync
           setDoc(doc(db, 'users', firebaseUser.uid), userData, { merge: true })
             .catch(e => console.error("Error saving user to Firestore:", e));
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (password) {
        // Try to sign in or sign up
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
          // If user not found, try to create new account (Simplified Flow)
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
             await createUserWithEmailAndPassword(auth, email, password);
          } else {
             throw error;
          }
        }
      } else {
        throw new Error("Password required for real auth");
      }
    } catch (error) {
      console.error(error);
      alert('Login Failed: ' + (error as any).message);
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
          console.log("Starting Google Sign In (Web)...");
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          console.log("Firebase Web Sign In Success");
      } else {
          console.log("Starting Google Sign In (Native)...");
          await GoogleSignin.hasPlayServices();
          
          console.log("Requesting Google Sign In...");
          const response = await GoogleSignin.signIn();
          
          const idToken = response.data?.idToken;
          if (!idToken) {
              console.error("No ID Token in response", response);
              throw new Error('No ID token found in Google response');
          }
          
          console.log("Got ID Token, signing into Firebase...");
          const googleCredential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, googleCredential);
          console.log("Firebase Sign In Success");
      }
      
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      alert('Login Error: ' + (error.message || JSON.stringify(error)));
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      if (Platform.OS !== 'web') {
        try {
            await GoogleSignin.signOut();
        } catch (e) {
            console.log("Google SignOut Error (ignoring):", e);
        }
      }
      setUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const updateProfile = async (displayName: string) => {
    if (user) {
      setUser({ ...user, displayName });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
