
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import type { 
  Expense, Category, BudgetGoal, AppState, AppContextType, 
  Member, Contribution, ShoppingListItem, SharedBudget, Debt, HouseholdMemberNetData, HouseholdSettlement,
  Trip, TripMember, TripContribution, TripExpense, TripMemberNetData, TripSettlement
} from '@/lib/types';
import { INITIAL_CATEGORIES, HOUSEHOLD_EXPENSE_CATEGORY_ID } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid'; 
import { formatISO, parseISO, subDays, isWithinInterval } from 'date-fns';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Household specific states
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('trackwise_expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_budget_goals', []);
  const [members, setMembers] = useLocalStorage<Member[]>('trackwise_members', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_contributions', []);
  const [sharedBudgets, setSharedBudgets] = useLocalStorage<SharedBudget[]>('trackwise_shared_budgets', []);
  const [debts, setDebts] = useLocalStorage<Debt[]>('trackwise_debts', []);
  const [householdOverallSettlements, setHouseholdOverallSettlements] = useLocalStorage<HouseholdSettlement[]>('trackwise_household_settlements', []);
  
  // General / potentially shared states
  const [shoppingListItems, setShoppingListItems] = useLocalStorage<ShoppingListItem[]>('trackwise_shopping_list_items', []);

  // Trip specific states
  const [trips, setTrips] = useLocalStorage<Trip[]>('trackwise_trips', []);
  const [tripMembers, setTripMembers] = useLocalStorage<TripMember[]>('trackwise_trip_members', []);
  const [tripContributions, setTripContributions] = useLocalStorage<TripContribution[]>('trackwise_trip_contributions', []);
  const [tripExpenses, setTripExpenses] = useLocalStorage<TripExpense[]>('trackwise_trip_expenses', []);
  const [tripSettlementsMap, setTripSettlementsMap] = useLocalStorage<Record<string, TripSettlement[]>>('trackwise_trip_settlements_map', {});


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
    // Recalculate household settlements if the expense affects the pot
    if (newExpense.sharedBudgetId || newExpense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID) {
      _calculateAndStoreHouseholdSettlements();
    }
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setDebts(prevDebts => manageDebtsForExpense(updatedExpense, prevDebts));
    if (updatedExpense.sharedBudgetId || updatedExpense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID) {
      _calculateAndStoreHouseholdSettlements();
    }
  };

  const deleteExpense = (expenseId: string) => {
    const expenseToDelete = expenses.find(exp => exp.id === expenseId);
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== expenseId));
    if (expenseToDelete && (expenseToDelete.sharedBudgetId || expenseToDelete.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID)) {
       _calculateAndStoreHouseholdSettlements();
    }
  };
  
  const addBudgetGoal = (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setBudgetGoals(prev => [...prev, { ...goal, id: uuidv4(), currentSpending: 0 }]);
  };

  const updateBudgetGoal = (updatedGoal: BudgetGoal) => {
    setBudgetGoals(prev => prev.map(goal => 
        goal.id === updatedGoal.id ? { ...goal, ...updatedGoal } : goal 
    ));
  };

  const deleteBudgetGoal = (goalId: string) => {
    setBudgetGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const getCategoryById = useCallback((categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  }, [categories]);

  // --- Household Member and Contribution ---
  const addMember = (member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
    _calculateAndStoreHouseholdSettlements();
  };
  
  const deleteMemberContributionsAndDebts = (memberId: string) => {
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
  };

  const deleteMember = (memberId: string) => {
    deleteMemberContributionsAndDebts(memberId);
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
     _calculateAndStoreHouseholdSettlements();
  };

  const addContribution = (contribution: Omit<Contribution, 'id'>) => {
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
    _calculateAndStoreHouseholdSettlements();
  };

  const getMemberContributions = useCallback((memberId: string): Contribution[] => {
    return contributions.filter(contrib => contrib.memberId === memberId);
  }, [contributions]);
  
  const getMemberTotalContribution = useCallback((memberId: string): number => {
    return contributions
      .filter(contrib => contrib.memberId === memberId)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  }, [contributions]);

  const getTotalHouseholdSpending = useCallback((): number => {
    let totalSpending = 0;
    const spentOnSharedBudgetsIds = new Set<string>();

    expenses.forEach(expense => {
      if (expense.sharedBudgetId && sharedBudgets.some(sb => sb.id === expense.sharedBudgetId)) {
        totalSpending += expense.amount;
        spentOnSharedBudgetsIds.add(expense.id);
      }
    });
    
    expenses.forEach(expense => {
      if (expense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID && !spentOnSharedBudgetsIds.has(expense.id)) {
        totalSpending += expense.amount;
      }
    });
    
    return totalSpending;
  }, [expenses, sharedBudgets]);

  const getHouseholdMemberNetPotData = useCallback((memberId: string): HouseholdMemberNetData => {
    const directContributionToPot = getMemberTotalContribution(memberId);
    const totalPotSpending = getTotalHouseholdSpending();
    const numMembers = members.length > 0 ? members.length : 1; // Avoid division by zero if no members
    
    // Share of pot expenses is total pot spending divided equally among members
    const shareOfPotExpenses = totalPotSpending / numMembers;
    const netPotShare = directContributionToPot - shareOfPotExpenses;

    return { directContributionToPot, shareOfPotExpenses, netPotShare };
  }, [getMemberTotalContribution, getTotalHouseholdSpending, members]);

  const _calculateAndStoreHouseholdSettlements = useCallback(() => {
    if (members.length === 0) {
      setHouseholdOverallSettlements([]);
      return;
    }

    const memberNetPotShares = members.map(member => ({
      id: member.id,
      netShare: getHouseholdMemberNetPotData(member.id).netPotShare,
    }));

    let debtors = memberNetPotShares.filter(m => m.netShare < -0.005).map(m => ({ id: m.id, amount: Math.abs(m.netShare) }));
    let creditors = memberNetPotShares.filter(m => m.netShare > 0.005).map(m => ({ id: m.id, amount: m.netShare }));

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlementsForHousehold: HouseholdSettlement[] = [];
    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount > 0.005) {
        settlementsForHousehold.push({
          id: uuidv4(),
          tripId: 'household_pot_settlement', // Generic ID for household context
          owedByTripMemberId: debtor.id, // Field name kept for type reuse, represents Member ID here
          owedToTripMemberId: creditor.id, // Field name kept for type reuse, represents Member ID here
          amount: transferAmount,
        });
        debtor.amount -= transferAmount;
        creditor.amount -= transferAmount;
      }
      if (debtor.amount <= 0.005) debtorIdx++;
      if (creditor.amount <= 0.005) creditorIdx++;
    }
    setHouseholdOverallSettlements(settlementsForHousehold);
  }, [members, getHouseholdMemberNetPotData, setHouseholdOverallSettlements]);

  const triggerHouseholdSettlementCalculation = useCallback(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [_calculateAndStoreHouseholdSettlements]);

  const getHouseholdOverallSettlements = useCallback((): HouseholdSettlement[] => {
    return householdOverallSettlements;
  }, [householdOverallSettlements]);


  // --- Shared Budgets (Household) ---
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
      prev.map(budget => 
        budget.id === updatedBudget.id ? 
        { 
          ...budget, 
          name: updatedBudget.name, 
          amount: updatedBudget.amount, 
          period: updatedBudget.period,
          description: updatedBudget.description
          // currentSpending is updated via useEffect below
        } : budget
      )
    );
  };

  const deleteSharedBudget = (budgetId: string) => {
    setSharedBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    setExpenses(prevExpenses => 
      prevExpenses.map(exp => 
        exp.sharedBudgetId === budgetId ? { ...exp, sharedBudgetId: undefined } : exp
      )
    );
    _calculateAndStoreHouseholdSettlements(); // Recalculate if shared budget deletion impacts pot expenses
  };
  
  // --- Debts (Household - from individual expense splits) ---
  const settleDebt = (debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: true, settledAt: formatISO(new Date()) } : d));
  };
  const unsettleDebt = (debtId: string) => {
     setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: false, settledAt: undefined } : d));
  };

  const getDebtsOwedByMember = useCallback((memberId: string, includeSettled: boolean = false) => {
    return debts.filter(d => d.owedByMemberId === memberId && (includeSettled || !d.isSettled));
  }, [debts]);

  const getDebtsOwedToMember = useCallback((memberId: string, includeSettled: boolean = false) => {
    return debts.filter(d => d.owedToMemberId === memberId && (includeSettled || !d.isSettled));
  }, [debts]);

  const getAllDebts = useCallback((includeSettled: boolean = false) => {
    return includeSettled ? debts : debts.filter(d => !d.isSettled);
  }, [debts]);


  // --- Shopping List ---
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

  const copyLastWeeksPurchasedItems = useCallback(() => {
    const today = new Date();
    const fourteenDaysAgo = subDays(today, 14);
    
    const recentPurchasedItems = shoppingListItems.filter(item => {
      if (!item.isPurchased) return false;
      try {
        const addedDate = parseISO(item.addedAt);
        return isWithinInterval(addedDate, { start: fourteenDaysAgo, end: today });
      } catch (e) {
        return false; 
      }
    });

    const currentUnpurchasedNames = shoppingListItems
      .filter(item => !item.isPurchased)
      .map(item => item.itemName.toLowerCase());

    const itemsToAdd: ShoppingListItem[] = recentPurchasedItems
      .filter(item => !currentUnpurchasedNames.includes(item.itemName.toLowerCase()))
      .map(item => ({
        id: uuidv4(),
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes,
        isPurchased: false,
        addedAt: formatISO(new Date()),
      }));

    if (itemsToAdd.length > 0) {
      setShoppingListItems(prev => [...itemsToAdd, ...prev]);
    }
    return itemsToAdd.length;
  }, [shoppingListItems, setShoppingListItems]);


  // --- Trip Functions ---
  const addTrip = (tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    const newTrip: Trip = {
      ...tripData,
      id: uuidv4(),
      createdAt: formatISO(new Date()),
    };
    setTrips(prev => [...prev, newTrip]);
  };

  const getTripById = useCallback((tripId: string): Trip | undefined => {
    return trips.find(trip => trip.id === tripId);
  }, [trips]);

  const getTrips = useCallback((): Trip[] => {
    return trips;
  }, [trips]);

  const getTripMembers = useCallback((tripId: string): TripMember[] => {
    return tripMembers.filter(member => member.tripId === tripId);
  }, [tripMembers]);
  
  const getTripMemberById = useCallback((tripMemberId: string): TripMember | undefined => {
    return tripMembers.find(member => member.id === tripMemberId);
  }, [tripMembers]);

  const getTripMemberTotalDirectContribution = useCallback((tripMemberId: string, tripIdToFilter?: string): number => {
    return tripContributions
      .filter(contrib => contrib.tripMemberId === tripMemberId && (!tripIdToFilter || contrib.tripId === tripIdToFilter))
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  }, [tripContributions]);

  const getTripExpenses = useCallback((tripIdToFilter: string): TripExpense[] => {
    return tripExpenses.filter(expense => expense.tripId === tripIdToFilter);
  }, [tripExpenses]);

  const getTripMemberNetData = useCallback((tripId: string, tripMemberId: string): TripMemberNetData => {
    const membersOfThisTrip = getTripMembers(tripId);
    const memberExistsInTrip = membersOfThisTrip.some(tm => tm.id === tripMemberId);

    const directContribution = getTripMemberTotalDirectContribution(tripMemberId, tripId);
    let shareOfExpenses = 0;

    if (memberExistsInTrip) {
      const expensesForThisTrip = getTripExpenses(tripId);
      const numMembersInTripForExpenseSharing = membersOfThisTrip.length > 0 ? membersOfThisTrip.length : 1;

      expensesForThisTrip.forEach(expense => {
        if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
          if (expense.splitWithTripMemberIds.includes(tripMemberId)) {
            shareOfExpenses += expense.amount / expense.splitWithTripMemberIds.length;
          }
        } else { 
          // If not split, or split list is empty, assume it's shared equally by all current trip members
          shareOfExpenses += expense.amount / numMembersInTripForExpenseSharing;
        }
      });
    }
    
    const netShare = directContribution - shareOfExpenses;
    return { directContribution, shareOfExpenses, netShare };
  }, [getTripMembers, getTripMemberTotalDirectContribution, getTripExpenses]);


  const _calculateAndStoreTripSettlements = useCallback((tripId: string) => {
    const currentTripMembers = getTripMembers(tripId);
    if (currentTripMembers.length === 0) {
      setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: [] }));
      return;
    }

    const memberNetShares: { id: string; netShare: number }[] = currentTripMembers.map(member => ({
      id: member.id,
      netShare: getTripMemberNetData(tripId, member.id).netShare,
    }));

    let debtors = memberNetShares.filter(m => m.netShare < -0.005).map(m => ({ id: m.id, amount: Math.abs(m.netShare) }));
    let creditors = memberNetShares.filter(m => m.netShare > 0.005).map(m => ({ id: m.id, amount: m.netShare }));

    debtors.sort((a, b) => b.amount - a.amount); 
    creditors.sort((a, b) => b.amount - a.amount); 

    const settlementsForTrip: TripSettlement[] = [];
    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount > 0.005) { 
        settlementsForTrip.push({
          id: uuidv4(),
          tripId,
          owedByTripMemberId: debtor.id,
          owedToTripMemberId: creditor.id,
          amount: transferAmount,
        });

        debtor.amount -= transferAmount;
        creditor.amount -= transferAmount;
      }

      if (debtor.amount <= 0.005) {
        debtorIdx++;
      }
      if (creditor.amount <= 0.005) {
        creditorIdx++;
      }
    }
    setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: settlementsForTrip }));
  }, [getTripMembers, getTripMemberNetData, setTripSettlementsMap]);

  const triggerTripSettlementCalculation = useCallback((tripId: string) => {
    _calculateAndStoreTripSettlements(tripId);
  }, [_calculateAndStoreTripSettlements]);

  const getTripSettlements = useCallback((tripId: string): TripSettlement[] => {
    return tripSettlementsMap[tripId] || [];
  }, [tripSettlementsMap]);

  // Trip Member Functions
  const addTripMember = (tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => {
    const newTripMember: TripMember = {
      ...memberData,
      id: uuidv4(),
      tripId,
    };
    setTripMembers(prev => [...prev, newTripMember]);
    _calculateAndStoreTripSettlements(tripId);
  };

  const deleteTripMember = (tripMemberId: string, tripId: string) => {
    setTripMembers(prev => prev.filter(member => member.id !== tripMemberId));
    setTripContributions(prev => prev.filter(contrib => contrib.tripMemberId !== tripMemberId));
    setTripExpenses(prevExpenses => {
      return prevExpenses.map(exp => {
        if (exp.tripId === tripId) {
          const newSplitWith = exp.splitWithTripMemberIds?.filter(id => id !== tripMemberId);
          return {
            ...exp,
            paidByTripMemberId: exp.paidByTripMemberId === tripMemberId ? undefined : exp.paidByTripMemberId,
            splitWithTripMemberIds: newSplitWith,
            isSplit: newSplitWith && newSplitWith.length > 0 ? exp.isSplit : false 
          };
        }
        return exp;
      });
    });
    _calculateAndStoreTripSettlements(tripId);
  };

  // Trip Contribution Functions
  const addTripContribution = (tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => {
    const newTripContribution: TripContribution = {
      ...contributionData,
      id: uuidv4(),
      tripId,
      tripMemberId,
      date: formatISO(contributionData.date), // Ensure date is ISO string
    };
    setTripContributions(prev => [...prev, newTripContribution]);
    _calculateAndStoreTripSettlements(tripId);
  };

  const getTripContributionsForMember = useCallback((tripMemberId: string): TripContribution[] => {
    return tripContributions.filter(contrib => contrib.tripMemberId === tripMemberId);
  }, [tripContributions]);
  
  // Trip Expense Functions
  const addTripExpense = (expenseData: Omit<TripExpense, 'id'>) => {
    const newTripExpense: TripExpense = {
      ...expenseData,
      id: uuidv4(),
    };
    setTripExpenses(prev => [...prev, newTripExpense]);
    _calculateAndStoreTripSettlements(expenseData.tripId);
  };

  // --- Effects for dynamic calculations ---
  React.useEffect(() => {
    setBudgetGoals(prevGoals => 
      prevGoals.map(goal => {
        const relevantExpenses = expenses.filter(exp => {
          if (exp.categoryId !== goal.categoryId) return false;
          return true; 
        });
        const currentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { ...goal, currentSpending };
      })
    );
  }, [expenses, setBudgetGoals]); 

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
      return hasChanged ? newSharedBudgets : prevSharedBudgets;
    });
  }, [expenses, setSharedBudgets]);

  // Effect to recalculate household settlements if relevant data changes
  useEffect(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [members, contributions, expenses, sharedBudgets, _calculateAndStoreHouseholdSettlements]);


  const value: AppContextType = {
    expenses, categories, budgetGoals, members, contributions, sharedBudgets, debts,
    shoppingListItems,
    trips, tripMembers, tripContributions, tripExpenses, 
    addExpense, updateExpense, deleteExpense,
    addBudgetGoal, updateBudgetGoal, deleteBudgetGoal, getCategoryById,
    addMember, deleteMember, getMemberById,
    addContribution, getMemberContributions, getMemberTotalContribution,
    getTotalHouseholdSpending, getHouseholdMemberNetPotData, getHouseholdOverallSettlements, triggerHouseholdSettlementCalculation,
    addSharedBudget, updateSharedBudget, deleteSharedBudget,
    settleDebt, unsettleDebt, getDebtsOwedByMember, getDebtsOwedToMember, getAllDebts,
    addShoppingListItem, editShoppingListItem, toggleShoppingListItemPurchased, deleteShoppingListItem, copyLastWeeksPurchasedItems,
    addTrip, getTripById, getTrips,
    addTripMember, getTripMembers, deleteTripMember, getTripMemberById,
    addTripContribution, getTripContributionsForMember, getTripMemberTotalDirectContribution, 
    addTripExpense, getTripExpenses,
    getTripMemberNetData, getTripSettlements, triggerTripSettlementCalculation,
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

