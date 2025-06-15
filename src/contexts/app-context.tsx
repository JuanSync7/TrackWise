
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { PersonalFinanceProvider } from './personal-finance-context';
import { HouseholdProvider } from './household-context';
import { TripProvider } from './trip-context';
// AppContextType might be empty if all state is delegated
import type { AppContextType } from '@/lib/types';

// The main AppContext might become very minimal or even be removed
// if all responsibilities are delegated to domain-specific contexts.
// For now, it can act as a wrapper for other providers.
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Potentially, any truly global, non-domain-specific state could live here.
  // For this refactor, we are moving all existing state to domain contexts.
  const value: AppContextType = {
    // currently empty as all state is delegated
  };

  return (
    <AppContext.Provider value={value}>
      <PersonalFinanceProvider>
        <HouseholdProvider>
          <TripProvider>
            {children}
          </TripProvider>
        </HouseholdProvider>
      </PersonalFinanceProvider>
    </AppContext.Provider>
  );
};

// This hook might be deprecated if AppContext ends up having no direct value.
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
