
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  auth,
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
    providerId: 'password',
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(false); 
  }, []);

  const loginWithEmail = useCallback(async (credentials: EmailCredentials) => {
    setLoading(true);
    console.log("Attempting MOCK login with:", credentials.email);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockUser = createMockUser(credentials.email);
    setUser(mockUser);
    toast({ title: "Mock Login Successful", description: `Welcome back, ${mockUser.displayName}!` });
    router.push('/dashboard'); 
    setLoading(false);
  }, [router, toast]);

  const signupWithEmail = useCallback(async (credentials: SignupCredentials) => {
    setLoading(true);
    console.log("Attempting MOCK signup for:", credentials.email);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockUser = createMockUser(credentials.email, credentials.displayName);
    setUser(mockUser);
    toast({ title: "Mock Signup Successful", description: `Welcome to Trackwise, ${mockUser.displayName}!` });
    router.push('/dashboard');
    setLoading(false);
  }, [router, toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    console.log("Attempting MOCK logout");
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    toast({ title: "Mock Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); 
    setLoading(false);
  }, [router, toast]);

  const value = useMemo(() => ({
    user,
    loading,
    loginWithEmail,
    signupWithEmail,
    logout,
  }), [user, loading, loginWithEmail, signupWithEmail, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
