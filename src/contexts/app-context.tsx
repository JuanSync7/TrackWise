
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback } from 'react';
import type { Expense, Category, BudgetGoal, AppState, AppContextType, Member, Contribution, ShoppingListItem, SharedBudget, Debt } from '@/lib/types';
import { INITIAL_CATEGORIES, HOUSEHOLD_EXPENSE_CATEGORY_ID } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import { formatISO, parseISO } from 'date-fns';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('trackwise_expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_budget_goals', []);
  const [members, setMembers] = useLocalStorage<Member[]>('trackwise_members', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_contributions', []);
  const [shoppingListItems, setShoppingListItems] = useLocalStorage<ShoppingListItem[]>('trackwise_shopping_list_items', []);
  const [sharedBudgets, setSharedBudgets] = useLocalStorage<SharedBudget[]>('trackwise_shared_budgets', []);
  const [debts, setDebts] = useLocalStorage<Debt[]>('trackwise_debts', []);

  const getMemberById = useCallback((memberId: string) => {
    return members.find(member => member.id === memberId);
  }, [members]);

  const manageDebtsForExpense = useCallback((expense: Expense, currentDebts: Debt[]): Debt[] => {
    let updatedDebts = currentDebts.filter(d => d.expenseId !== expense.id); 

    if (expense.isSplit && expense.paidByMemberId && expense.splitWithMemberIds && expense.splitWithMemberIds.length > 0) {
      const amountPerPerson = expense.amount / expense.splitWithMemberIds.length;
      
      expense.splitWithMemberIds.forEach(memberIdInSplit => {
        if (memberIdInSplit !== expense.paidByMemberId) {
          const newDebt: Debt = {
            id: uuidv4(),
            expenseId: expense.id,
            expenseDescription: expense.description,
            amount: amountPerPerson,
            owedByMemberId: memberIdInSplit,
            owedToMemberId: expense.paidByMemberId!,
            isSettled: false,
            createdAt: formatISO(new Date()),
          };
          updatedDebts.push(newDebt);
        }
      });
    }
    return updatedDebts;
  }, []);


  const addExpense = (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...newExpenseData, id: uuidv4() };
    setExpenses(prev => [...prev, newExpense]);
    setDebts(prevDebts => manageDebtsForExpense(newExpense, prevDebts));
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setDebts(prevDebts => manageDebtsForExpense(updatedExpense, prevDebts));
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== expenseId));
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

  const getCategoryById = useCallback((categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  }, [categories]);

  const addMember = (member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
  };
  
  const deleteMemberContributionsAndDebts = (memberId: string) => {
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
  };

  const deleteMember = (memberId: string) => {
    deleteMemberContributionsAndDebts(memberId);
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
  };

  const addContribution = (contribution: Omit<Contribution, 'id'>) => {
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
  };

  const getMemberContributions = useCallback((memberId: string): Contribution[] => {
    return contributions.filter(contrib => contrib.memberId === memberId);
  }, [contributions]);
  
  const getMemberTotalContribution = useCallback((memberId: string): number => {
    return contributions
      .filter(contrib => contrib.memberId === memberId)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  }, [contributions]);

  const addShoppingListItem = (item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => {
    const newItem: ShoppingListItem = {
      ...item,
      id: uuidv4(),
      isPurchased: false,
      addedAt: formatISO(new Date()),
    };
    setShoppingListItems(prev => [...prev, newItem]);
  };

  const editShoppingListItem = (updatedItem: Pick<ShoppingListItem, 'id' | 'itemName' | 'quantity' | 'notes'>) => {
    setShoppingListItems(prev => 
      prev.map(item => 
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      )
    );
  };

  const toggleShoppingListItemPurchased = (itemId: string) => {
    setShoppingListItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isPurchased: !item.isPurchased } : item
      )
    );
  };

  const deleteShoppingListItem = (itemId: string) => {
    setShoppingListItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addSharedBudget = (budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => {
    const newSharedBudget: SharedBudget = {
      ...budget,
      id: uuidv4(),
      createdAt: formatISO(new Date()),
      currentSpending: 0,
    };
    setSharedBudgets(prev => [...prev, newSharedBudget]);
  };

  const updateSharedBudget = (updatedBudget: SharedBudget) => {
    setSharedBudgets(prev =>
      prev.map(budget => (budget.id === updatedBudget.id ? updatedBudget : budget))
    );
  };

  const deleteSharedBudget = (budgetId: string) => {
    setSharedBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    setExpenses(prevExpenses => 
      prevExpenses.map(exp => 
        exp.sharedBudgetId === budgetId ? { ...exp, sharedBudgetId: undefined } : exp
      )
    );
  };

  const settleDebt = (debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: true, settledAt: formatISO(new Date()) } : d));
  };
  const unsettleDebt = (debtId: string) => {
     setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: false, settledAt: undefined } : d));
  };

  const getDebtsOwedByMember = useCallback((memberId: string) => {
    return debts.filter(d => d.owedByMemberId === memberId && !d.isSettled);
  }, [debts]);

  const getDebtsOwedToMember = useCallback((memberId: string) => {
    return debts.filter(d => d.owedToMemberId === memberId && !d.isSettled);
  }, [debts]);

  const getAllUnsettledDebts = useCallback(() => {
    return debts.filter(d => !d.isSettled);
  }, [debts]);

  const getTotalHouseholdSpending = useCallback((): number => {
    let totalSpending = 0;
    const spentOnSharedBudgetsIds = new Set<string>();

    // Sum expenses linked to any shared budget
    expenses.forEach(expense => {
      if (expense.sharedBudgetId && sharedBudgets.some(sb => sb.id === expense.sharedBudgetId)) {
        totalSpending += expense.amount;
        spentOnSharedBudgetsIds.add(expense.id);
      }
    });
    
    // Sum expenses categorized as "Household Expenses" that were not already counted
    expenses.forEach(expense => {
      if (expense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID && !spentOnSharedBudgetsIds.has(expense.id)) {
        totalSpending += expense.amount;
      }
    });
    
    return totalSpending;
  }, [expenses, sharedBudgets]);


  React.useEffect(() => {
    setBudgetGoals(prevGoals => 
      prevGoals.map(goal => {
        const relevantExpenses = expenses.filter(exp => {
          if (exp.categoryId !== goal.categoryId) return false;
          // Basic period matching, can be improved
          // For simplicity, we're not doing strict date matching for periods here
          return true; 
        });
        const currentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { ...goal, currentSpending };
      })
    );
  }, [expenses, setBudgetGoals]); // setBudgetGoals dependency is okay here as it's setting a different piece of state

  React.useEffect(() => {
    setSharedBudgets(prevSharedBudgets => {
      let hasChanged = false;
      const newSharedBudgets = prevSharedBudgets.map(sharedBudget => {
        const relevantExpenses = expenses.filter(
          exp => exp.sharedBudgetId === sharedBudget.id
        );
        const newCurrentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        if (newCurrentSpending !== sharedBudget.currentSpending) {
          hasChanged = true;
        }
        return { ...sharedBudget, currentSpending: newCurrentSpending };
      });
      // Only update state if any currentSpending value actually changed to avoid unnecessary re-renders
      return hasChanged ? newSharedBudgets : prevSharedBudgets;
    });
  }, [expenses]); // Now only depends on expenses for recalculating currentSpending


  const value: AppContextType = {
    expenses,
    categories,
    budgetGoals,
    members,
    contributions,
    shoppingListItems,
    sharedBudgets,
    debts,
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
    getTotalHouseholdSpending,
    addShoppingListItem,
    editShoppingListItem,
    toggleShoppingListItemPurchased,
    deleteShoppingListItem,
    addSharedBudget,
    updateSharedBudget,
    deleteSharedBudget,
    settleDebt,
    unsettleDebt,
    getDebtsOwedByMember,
    getDebtsOwedToMember,
    getAllUnsettledDebts,
    getMemberById,
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

