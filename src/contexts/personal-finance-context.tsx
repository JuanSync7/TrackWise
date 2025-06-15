
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { Transaction, Category, BudgetGoal, PersonalFinanceContextType } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns';

const PersonalFinanceContext = createContext<PersonalFinanceContextType | undefined>(undefined);

export const PersonalFinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('trackwise_personal_transactions', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_personal_budget_goals', []);

  const getCategoryById = useCallback((categoryId: string) => categories.find(cat => cat.id === categoryId), [categories]);

  const addTransaction = useCallback((newTransactionData: Omit<Transaction, 'id'>) => {
    let nextRecurrenceDate: string | undefined = undefined;
    if (newTransactionData.isRecurring && newTransactionData.recurrencePeriod && newTransactionData.date) {
        const startDate = parseISO(newTransactionData.date); // Ensure date is parsed correctly
        switch (newTransactionData.recurrencePeriod) {
            case 'daily': nextRecurrenceDate = format(addDays(startDate, 1), "yyyy-MM-dd"); break;
            case 'weekly': nextRecurrenceDate = format(addWeeks(startDate, 1), "yyyy-MM-dd"); break;
            case 'monthly': nextRecurrenceDate = format(addMonths(startDate, 1), "yyyy-MM-dd"); break;
            case 'yearly': nextRecurrenceDate = format(addYears(startDate, 1), "yyyy-MM-dd"); break;
        }
        if (newTransactionData.recurrenceEndDate && nextRecurrenceDate && new Date(nextRecurrenceDate) > parseISO(newTransactionData.recurrenceEndDate)) {
            nextRecurrenceDate = undefined;
        }
    }
    const newTransaction = { ...newTransactionData, id: uuidv4(), nextRecurrenceDate };
    setTransactions(prev => [...prev, newTransaction]);
  }, [setTransactions]);

  const updateTransaction = useCallback((updatedTransaction: Transaction) => {
    let nextRecurrenceDate: string | undefined = updatedTransaction.nextRecurrenceDate; // Preserve if already calculated
    if (updatedTransaction.isRecurring && updatedTransaction.recurrencePeriod && updatedTransaction.date) {
        const startDate = parseISO(updatedTransaction.date);
        let potentialNextDate: string | undefined;
        switch (updatedTransaction.recurrencePeriod) {
            case 'daily': potentialNextDate = format(addDays(startDate, 1), "yyyy-MM-dd"); break;
            case 'weekly': potentialNextDate = format(addWeeks(startDate, 1), "yyyy-MM-dd"); break;
            case 'monthly': potentialNextDate = format(addMonths(startDate, 1), "yyyy-MM-dd"); break;
            case 'yearly': potentialNextDate = format(addYears(startDate, 1), "yyyy-MM-dd"); break;
        }
        if (updatedTransaction.recurrenceEndDate && potentialNextDate && new Date(potentialNextDate) > parseISO(updatedTransaction.recurrenceEndDate)) {
            nextRecurrenceDate = undefined;
        } else {
            nextRecurrenceDate = potentialNextDate;
        }
    } else if (!updatedTransaction.isRecurring) {
        nextRecurrenceDate = undefined; // Clear if not recurring
    }

    const transactionToSave = { ...updatedTransaction, nextRecurrenceDate };
    setTransactions(prev => prev.map(trans => trans.id === transactionToSave.id ? transactionToSave : trans));
  }, [setTransactions]);

  const deleteTransaction = useCallback((transactionId: string) => {
    setTransactions(prev => prev.filter(trans => trans.id !== transactionId));
  }, [setTransactions]);

  const addBudgetGoal = useCallback((goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setBudgetGoals(prev => [...prev, { ...goal, id: uuidv4(), currentSpending: 0 }]);
  }, [setBudgetGoals]);

  const updateBudgetGoal = useCallback((updatedGoal: BudgetGoal) => {
    setBudgetGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? { ...goal, ...updatedGoal } : goal ));
  }, [setBudgetGoals]);

  const deleteBudgetGoal = useCallback((goalId: string) => {
    setBudgetGoals(prev => prev.filter(goal => goal.id !== goalId));
  }, [setBudgetGoals]);
  
  useEffect(() => {
    setBudgetGoals(prevGoals => prevGoals.map(goal => ({
      ...goal, currentSpending: transactions.filter(trans => trans.transactionType === 'expense' && trans.categoryId === goal.categoryId).reduce((s, e) => s + e.amount, 0)
    })));
  }, [transactions, setBudgetGoals]);


  const value: PersonalFinanceContextType = {
    transactions, categories, budgetGoals,
    addTransaction, updateTransaction, deleteTransaction,
    addBudgetGoal, updateBudgetGoal, deleteBudgetGoal, getCategoryById,
  };

  return <PersonalFinanceContext.Provider value={value}>{children}</PersonalFinanceContext.Provider>;
};

export const usePersonalFinance = (): PersonalFinanceContextType => {
  const context = useContext(PersonalFinanceContext);
  if (context === undefined) {
    throw new Error('usePersonalFinance must be used within a PersonalFinanceProvider');
  }
  return context;
};

    