
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider, // Added for potential future use
  signInWithPopup    // Added for potential future use
} from '@/lib/firebase'; // Updated to import specific auth functions
import { useRouter } from 'next/navigation'; // For redirection
import { useToast } from "@/hooks/use-toast";

// Define the shape of the credentials for login and signup
interface EmailCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends EmailCredentials {
  displayName?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  loginWithEmail: (credentials: EmailCredentials) => Promise<void>;
  signupWithEmail: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  // googleSignIn: () => Promise<void>; // Example for future
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (credentials: EmailCredentials) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      // onAuthStateChanged will handle setting user and redirecting if necessary
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/dashboard'); // Redirect on successful login
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid email or password." });
      setLoading(false); // Ensure loading is set to false on error
    }
  };

  const signupWithEmail = async (credentials: SignupCredentials) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      if (userCredential.user && credentials.displayName) {
        await updateProfile(userCredential.user, { displayName: credentials.displayName });
        // Refresh user state to include displayName
        setUser({...userCredential.user, displayName: credentials.displayName });
      }
      toast({ title: "Signup Successful", description: "Welcome to Trackwise!" });
      router.push('/dashboard'); // Redirect on successful signup
    } catch (error: any) {
      console.error("Signup error:", error);
      // Check for specific Firebase error codes if needed for more granular messages
      toast({ variant: "destructive", title: "Signup Failed", description: error.message || "Could not create account." });
      setLoading(false); // Ensure loading is set to false on error
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); // Redirect to login page after logout
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    loginWithEmail,
    signupWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
