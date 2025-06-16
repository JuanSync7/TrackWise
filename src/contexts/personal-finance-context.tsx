
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import type { Transaction, Category, BudgetGoal, PersonalFinanceContextType, FinancialGoal, PersonalDebt } from '@/lib/types';
import { INITIAL_CATEGORIES, DEFAULT_CURRENCY } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns';

const PersonalFinanceContext = createContext<PersonalFinanceContextType | undefined>(undefined);

export const PersonalFinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('trackwise_personal_transactions', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_personal_budget_goals', []);
  const [financialGoals, setFinancialGoals] = useLocalStorage<FinancialGoal[]>('trackwise_financial_goals', []);
  const [personalDebts, setPersonalDebts] = useLocalStorage<PersonalDebt[]>('trackwise_personal_debts', []);


  const getCategoryById = useCallback((categoryId: string) => categories.find(cat => cat.id === categoryId), [categories]);

  const addCategory = useCallback((categoryData: Omit<Category, 'id'>) => {
    const newCategory = { ...categoryData, id: uuidv4() };
    setCategories(prev => [...prev, newCategory]);
  }, [setCategories]);

  const updateCategory = useCallback((updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  }, [setCategories]);

  const deleteCategory = useCallback((categoryId: string) => {
    const otherCategory = categories.find(c => c.name.toLowerCase() === 'other');
    
    setTransactions(prevTransactions => 
      prevTransactions.map(t => {
        if (t.categoryId === categoryId) {
          return { ...t, categoryId: otherCategory ? otherCategory.id : 'other' };
        }
        return t;
      })
    );
    setBudgetGoals(prevGoals => prevGoals.filter(goal => goal.categoryId !== categoryId));
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  }, [categories, setCategories, setTransactions, setBudgetGoals]);


  const addTransaction = useCallback((newTransactionData: Omit<Transaction, 'id'>) => {
    let nextRecurrenceDate: string | undefined = undefined;
    if (newTransactionData.isRecurring && newTransactionData.recurrencePeriod && newTransactionData.date) {
        const startDate = parseISO(newTransactionData.date);
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
    let nextRecurrenceDate: string | undefined = updatedTransaction.nextRecurrenceDate;
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
        } else if (potentialNextDate) { 
            nextRecurrenceDate = potentialNextDate;
        }
    } else if (!updatedTransaction.isRecurring) {
        nextRecurrenceDate = undefined;
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

  const addFinancialGoal = useCallback((goalData: Omit<FinancialGoal, 'id' | 'createdAt' | 'currentAmount'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: uuidv4(),
      createdAt: format(new Date(), "yyyy-MM-dd"),
      currentAmount: 0,
    };
    setFinancialGoals(prev => [...prev, newGoal]);
  }, [setFinancialGoals]);

  const updateFinancialGoal = useCallback((updatedGoal: FinancialGoal) => {
    setFinancialGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  }, [setFinancialGoals]);

  const deleteFinancialGoal = useCallback((goalId: string) => {
    setFinancialGoals(prev => prev.filter(g => g.id !== goalId));
  }, [setFinancialGoals]);

  const contributeToFinancialGoal = useCallback((goalId: string, amount: number) => {
    setFinancialGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) } : g));
    const goal = financialGoals.find(g => g.id === goalId);
    if (goal) {
        const savingsCategory = categories.find(c => c.name.toLowerCase() === "savings contribution");
        addTransaction({
            description: `Contribution to goal: ${goal.name}`,
            amount: amount,
            date: format(new Date(), "yyyy-MM-dd"),
            categoryId: savingsCategory?.id || 'other',
            transactionType: 'expense',
            notes: `Automated contribution for financial goal.`
        });
    }
  }, [setFinancialGoals, financialGoals, addTransaction, categories]);

  const addPersonalDebt = useCallback((debtData: Omit<PersonalDebt, 'id' | 'createdAt' | 'currentBalance'>) => {
    const newDebt: PersonalDebt = {
      ...debtData,
      id: uuidv4(),
      createdAt: format(new Date(), "yyyy-MM-dd"),
      currentBalance: debtData.initialAmount,
    };
    setPersonalDebts(prev => [...prev, newDebt]);
  }, [setPersonalDebts]);

  const updatePersonalDebt = useCallback((updatedDebt: PersonalDebt) => {
    setPersonalDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
  }, [setPersonalDebts]);

  const deletePersonalDebt = useCallback((debtId: string) => {
    setPersonalDebts(prev => prev.filter(d => d.id !== debtId));
  }, [setPersonalDebts]);

  const logPaymentToPersonalDebt = useCallback((debtId: string, paymentAmount: number, transactionDetails?: Omit<Transaction, 'id' | 'amount' | 'categoryId' | 'transactionType'>) => {
    setPersonalDebts(prev => prev.map(d => {
      if (d.id === debtId) {
        return { ...d, currentBalance: Math.max(0, d.currentBalance - paymentAmount) };
      }
      return d;
    }));
     const debt = personalDebts.find(d => d.id === debtId);
     if (debt) {
        const debtCategory = categories.find(c => c.name.toLowerCase() === "debt payment");
        addTransaction({
            description: transactionDetails?.description || `Payment for: ${debt.name}`,
            amount: paymentAmount,
            date: transactionDetails?.date || format(new Date(), "yyyy-MM-dd"),
            categoryId: debtCategory?.id || 'other',
            transactionType: 'expense',
            notes: transactionDetails?.notes || `Automated payment log for debt ${debt.name}.`
        });
    }
  }, [setPersonalDebts, personalDebts, addTransaction, categories]);


  const value = useMemo(() => ({
    transactions, categories, budgetGoals, financialGoals, personalDebts,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, updateCategory, deleteCategory, getCategoryById,
    addBudgetGoal, updateBudgetGoal, deleteBudgetGoal,
    addFinancialGoal, updateFinancialGoal, deleteFinancialGoal, contributeToFinancialGoal,
    addPersonalDebt, updatePersonalDebt, deletePersonalDebt, logPaymentToPersonalDebt,
  }), [
    transactions, categories, budgetGoals, financialGoals, personalDebts,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, updateCategory, deleteCategory, getCategoryById,
    addBudgetGoal, updateBudgetGoal, deleteBudgetGoal,
    addFinancialGoal, updateFinancialGoal, deleteFinancialGoal, contributeToFinancialGoal,
    addPersonalDebt, updatePersonalDebt, deletePersonalDebt, logPaymentToPersonalDebt,
  ]);

  return <PersonalFinanceContext.Provider value={value}>{children}</PersonalFinanceContext.Provider>;
};

export const usePersonalFinance = (): PersonalFinanceContextType => {
  const context = useContext(PersonalFinanceContext);
  if (context === undefined) {
    throw new Error('usePersonalFinance must be used within a PersonalFinanceProvider');
  }
  return context;
};
