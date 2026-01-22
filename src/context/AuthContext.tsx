import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { User } from '../models/types';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, GoogleAuthProvider, signInWithCredential, signInWithPopup, deleteUser, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { registerForPushNotificationsAsync } from '../services/notificationService';

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName?: string, phoneNumber?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
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
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '951918212136-ng0b9ds0a9nofl7lkc6ic293jh1qglak.apps.googleusercontent.com', // Updated for Prod
        });
      } catch (e) {
        console.error("Google Signin Config Error:", e);
      }
    }

    // Real Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Fetch existing additional data from Firestore (like phoneNumber)
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          const existingData = userDocSnap.exists() ? userDocSnap.data() : {};

          // 2. Prepare User Data combining Auth info and Firestore info
          const userData: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || existingData.email || '',
            displayName: existingData.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
            phoneNumber: existingData.phoneNumber, // Persist phone number from Firestore
          };

          setUser(userData);

          // 3. Sync/Update Firestore (Background)
          // Independent of Push Notification success
          (async () => {
              let token = null;
              try {
                  token = await registerForPushNotificationsAsync();
              } catch (e) {
                  console.warn("Push token fetch failed (ignoring):", e);
              }

              const updates: any = { ...userData }; // Start with current state
              if (token) updates.pushToken = token;
              
              // Sanitize updates to remove undefined values which Firestore hates
              Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

              // Always write to Firestore to ensure user exists
              await setDoc(userDocRef, updates, { merge: true });
          })().catch(e => console.error("Error saving user to Firestore:", e));
        } catch (error) {
           console.error("Error fetching user profile:", error);
           // Fallback if firestore fails
           setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Player'
           });
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
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          if (!userCredential.user.emailVerified) {
             await firebaseSignOut(auth);
             alert("Email not verified.\n\nPlease check your inbox for the activation link.");
             setIsLoading(false);
             return;
          }

        } catch (error: any) {
          // If user not found, try to create new account (Simplified Flow)
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
             try {
                const newCred = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(newCred.user);
                await firebaseSignOut(auth); // Force logout
                alert("Account created successfully!\n\nAn activation link has been sent to " + email + ".\nPlease verify your email before logging in.");
                setIsLoading(false);
                return;
             } catch (createError: any) {
                 if (createError.code === 'auth/email-already-in-use') {
                     // This implies the first sign-in failed due to wrong password (if invalid-credential covers both)
                     alert("Incorrect password.");
                 } else {
                     throw createError;
                 }
             }
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
          // console.log("Starting Google Sign In (Web)...");
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          // console.log("Firebase Web Sign In Success");
      } else {
          // console.log("Starting Google Sign In (Native)...");
          await GoogleSignin.hasPlayServices();
          
          // console.log("Requesting Google Sign In...");
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

  const updateProfile = async (data: { displayName?: string, phoneNumber?: string }) => {
    if (user) {
      // Optimistic update
      setUser({ ...user, ...data });
      // Firestore update
      try {
          // Use setDoc with merge: true to ensure document is created if it doesn't exist
          const validData = { ...data };
          Object.keys(validData).forEach(key => (validData as any)[key] === undefined && delete (validData as any)[key]);

          await setDoc(doc(db, 'users', user.id), validData, { merge: true });
      } catch (e: any) {
          console.error("Profile Update Error", e);
          alert("Failed to save profile changes: " + e.message);
      }
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser || !user) return;
    try {
      const uid = user.id;
      // 1. Soft Delete in Firestore (Anonymize)
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        displayName: "Deleted Player",
        email: "",
        deleted: true,
        updatedAt: Date.now()
      });

      // 2. Delete from Firebase Auth (handle recent login requirement)
      try {
        await deleteUser(auth.currentUser);
      } catch (e: any) {
        if (e.code === 'auth/requires-recent-login') {
          alert('Please sign out and sign in again, then try deleting your account.');
        } else {
          alert('Account deletion failed: ' + (e.message || e.code));
        }
        throw e;
      }
      setUser(null);
    } catch (e) {
      console.error('Delete Account Error', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signInWithGoogle, signOut, updateProfile, deleteAccount }}>
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
