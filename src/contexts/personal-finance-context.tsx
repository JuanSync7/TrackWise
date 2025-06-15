
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { Expense, Category, BudgetGoal, PersonalFinanceContextType } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';

const PersonalFinanceContext = createContext<PersonalFinanceContextType | undefined>(undefined);

const defaultMemberDisplayFinancials = {
  directCashContribution: 0,
  amountPersonallyPaidForGroup: 0,
  totalShareOfAllGroupExpenses: 0,
  netOverallPosition: 0,
};

export const PersonalFinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('trackwise_personal_expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_personal_budget_goals', []);

  const getCategoryById = useCallback((categoryId: string) => categories.find(cat => cat.id === categoryId), [categories]);

  const addExpense = useCallback((newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...newExpenseData, id: uuidv4() };
    setExpenses(prev => [...prev, newExpense]);
  }, [setExpenses]);

  const updateExpense = useCallback((updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
  }, [setExpenses]);

  const deleteExpense = useCallback((expenseId: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
  }, [setExpenses]);

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
      ...goal, currentSpending: expenses.filter(exp => exp.categoryId === goal.categoryId).reduce((s, e) => s + e.amount, 0)
    })));
  }, [expenses, setBudgetGoals]);


  const value: PersonalFinanceContextType = {
    expenses, categories, budgetGoals,
    addExpense, updateExpense, deleteExpense,
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
