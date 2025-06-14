"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import type { Expense, Category, BudgetGoal, AppState, AppContextType, Member, Contribution } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('trackwise_expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_budget_goals', []);
  const [members, setMembers] = useLocalStorage<Member[]>('trackwise_members', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_contributions', []);

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...expense, id: uuidv4() }]);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
  };
  
  const addBudgetGoal = (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setBudgetGoals(prev => [...prev, { ...goal, id: uuidv4(), currentSpending: 0 }]);
  };

  const updateBudgetGoal = (updatedGoal: BudgetGoal) => {
    setBudgetGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
  };

  const deleteBudgetGoal = (goalId: string) => {
    setBudgetGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  }

  const addMember = (member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
  };
  
  const deleteMemberContributions = (memberId: string) => {
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
  };

  const deleteMember = (memberId: string) => {
    deleteMemberContributions(memberId); // Also delete their contributions
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
  };

  const addContribution = (contribution: Omit<Contribution, 'id'>) => {
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
  };

  const getMemberContributions = (memberId: string): Contribution[] => {
    return contributions.filter(contrib => contrib.memberId === memberId);
  };
  
  const getMemberTotalContribution = (memberId: string): number => {
    return contributions
      .filter(contrib => contrib.memberId === memberId)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  };


  // Recalculate currentSpending for budget goals whenever expenses change
  React.useEffect(() => {
    setBudgetGoals(prevGoals => 
      prevGoals.map(goal => {
        const relevantExpenses = expenses.filter(
          exp => exp.categoryId === goal.categoryId && 
                 new Date(exp.date).getMonth() === new Date().getMonth() && // Basic monthly check
                 new Date(exp.date).getFullYear() === new Date().getFullYear()
        );
        const currentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { ...goal, currentSpending };
      })
    );
  }, [expenses, setBudgetGoals]);


  const value: AppContextType = {
    expenses,
    categories,
    budgetGoals,
    members,
    contributions,
    addExpense,
    updateExpense,
    deleteExpense,
    addBudgetGoal,
    updateBudgetGoal,
    deleteBudgetGoal,
    getCategoryById,
    addMember,
    deleteMember,
    addContribution,
    getMemberContributions,
    getMemberTotalContribution,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
