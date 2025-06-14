
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  auth,
  // createUserWithEmailAndPassword, // Mocked
  // signInWithEmailAndPassword, // Mocked
  // signOut, // Mocked
  // updateProfile, // Mocked
  GoogleAuthProvider, 
  signInWithPopup    
} from '@/lib/firebase'; 
import { useRouter } from 'next/navigation'; 
import { useToast } from "@/hooks/use-toast";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to create a more complete mock FirebaseUser object
const createMockUser = (email?: string, displayName?: string): FirebaseUser => ({
  uid: `mock-uid-${Date.now()}`,
  email: email || 'mockuser@example.com',
  displayName: displayName || 'Mock User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [{
    providerId: 'password', // or 'mock'
    uid: `mock-uid-${Date.now()}`,
    displayName: displayName || 'Mock User',
    email: email || 'mockuser@example.com',
    photoURL: null,
    phoneNumber: null,
  }],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: async () => { console.warn('Mock delete called'); },
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({
    token: 'mock-id-token',
    expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => { console.warn('Mock reload called'); },
  toJSON: () => ({}),
});


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Start true to mimic initial load
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Simulate initial auth check (no actual Firebase call)
    // If you want to persist the mock login across refresh, you could use localStorage here
    // For now, it will always start as logged out.
    setLoading(false); 
    // const unsubscribe = auth.onAuthStateChanged((currentUser) => {
    //   setUser(currentUser);
    //   setLoading(false);
    // });
    // return () => unsubscribe();
  }, []);

  const loginWithEmail = async (credentials: EmailCredentials) => {
    setLoading(true);
    console.log("Attempting MOCK login with:", credentials.email);
    // Simulate Firebase call
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    // Instead of calling Firebase:
    // await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    
    const mockUser = createMockUser(credentials.email);
    setUser(mockUser);
    
    toast({ title: "Mock Login Successful", description: `Welcome back, ${mockUser.displayName}!` });
    router.push('/dashboard'); 
    setLoading(false);
  };

  const signupWithEmail = async (credentials: SignupCredentials) => {
    setLoading(true);
    console.log("Attempting MOCK signup for:", credentials.email);
    // Simulate Firebase call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Instead of calling Firebase:
    // const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
    // if (userCredential.user && credentials.displayName) {
    //   await updateProfile(userCredential.user, { displayName: credentials.displayName });
    //   setUser({...userCredential.user, displayName: credentials.displayName });
    // } else if (userCredential.user) {
    //   setUser(userCredential.user);
    // }
    
    const mockUser = createMockUser(credentials.email, credentials.displayName);
    setUser(mockUser);

    toast({ title: "Mock Signup Successful", description: `Welcome to Trackwise, ${mockUser.displayName}!` });
    router.push('/dashboard');
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    console.log("Attempting MOCK logout");
    // Simulate Firebase call
    await new Promise(resolve => setTimeout(resolve, 300));

    // Instead of calling Firebase:
    // await signOut(auth);
    
    setUser(null);
    toast({ title: "Mock Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); 
    setLoading(false);
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
