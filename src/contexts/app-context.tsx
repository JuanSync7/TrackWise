
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
import { calculateNetFinancialPositions, generateSettlements, type MemberInput, type ExpenseInput, type NetPosition } from '@/lib/financial-utils';


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

  const _manageDebtsForExpense = useCallback((expense: Expense, currentDebts: Debt[]): Debt[] => {
    let updatedDebts = currentDebts.filter(d => d.expenseId !== expense.id);

    if (expense.isSplit && expense.paidByMemberId && expense.splitWithMemberIds && expense.splitWithMemberIds.length > 0) {
      const amountPerPerson = expense.amount / expense.splitWithMemberIds.length;

      expense.splitWithMemberIds.forEach(memberIdInSplit => {
        if (memberIdInSplit !== expense.paidByMemberId) {
          const newDebt: Debt = {
            id: uuidv4(),
            expenseId: expense.id,
            expenseDescription: expense.description,
            amount: parseFloat(amountPerPerson.toFixed(2)),
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


  const getCategoryById = useCallback((categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  }, [categories]);

  const getTripMembers = useCallback((tripId: string): TripMember[] => {
    return tripMembers.filter(member => member.tripId === tripId);
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
    const currentTripMembers = getTripMembers(tripId);
    if (currentTripMembers.length === 0) return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };

    const memberInputs: MemberInput[] = currentTripMembers.map(tm => ({
      id: tm.id,
      directContribution: getTripMemberTotalDirectContribution(tm.id, tripId),
    }));

    const expensesForThisTrip = getTripExpenses(tripId);
    const expenseInputs: ExpenseInput[] = expensesForThisTrip.map(exp => ({
      amount: exp.amount,
      isSplit: exp.isSplit || false,
      splitWithMemberIds: exp.splitWithTripMemberIds || [],
      paidByMemberId: exp.paidByTripMemberId
    }));

    const allTripMemberIds = currentTripMembers.map(tm => tm.id);
    const netPositions = calculateNetFinancialPositions(memberInputs, expenseInputs, allTripMemberIds);
    const memberData = netPositions.get(tripMemberId);

    return {
      directContribution: memberData?.directContribution || 0,
      shareOfExpenses: memberData?.shareOfExpenses || 0,
      netShare: memberData?.netShare || 0,
    };
  }, [getTripMembers, getTripMemberTotalDirectContribution, getTripExpenses]);


  const _calculateAndStoreTripSettlements = useCallback((tripId: string) => {
    const currentTripMembers = getTripMembers(tripId);
    if (currentTripMembers.length === 0) {
      setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: [] }));
      return;
    }
    const memberNetShares: NetPosition[] = currentTripMembers.map(member => {
        const data = getTripMemberNetData(tripId, member.id);
        return { memberId: member.id, netShare: data.netShare, directContribution: data.directContribution, shareOfExpenses: data.shareOfExpenses };
    });
    const rawSettlements = generateSettlements(memberNetShares);
    const finalSettlements: TripSettlement[] = rawSettlements.map(s => ({
        ...s, id: uuidv4(), tripId: tripId,
    }));
    setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: finalSettlements }));
  }, [getTripMembers, getTripMemberNetData, setTripSettlementsMap]);

  const triggerTripSettlementCalculation = useCallback((tripId: string) => {
    _calculateAndStoreTripSettlements(tripId);
  }, [_calculateAndStoreTripSettlements]);


  const getMemberTotalContribution = useCallback((memberId: string): number => {
    return contributions
      .filter(contrib => contrib.memberId === memberId)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  }, [contributions]);

  const getHouseholdMemberNetPotData = useCallback((householdMemberId: string): HouseholdMemberNetData => {
    const memberInputs: MemberInput[] = members.map(m => ({
      id: m.id,
      directContribution: getMemberTotalContribution(m.id),
    }));

    const potExpenses = expenses.filter(exp => {
        const isHouseholdCategory = exp.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID;
        const isLinkedToSharedBudget = exp.sharedBudgetId && sharedBudgets.some(sb => sb.id === exp.sharedBudgetId);
        return isHouseholdCategory || isLinkedToSharedBudget;
    });

    const expenseInputs: ExpenseInput[] = potExpenses.map(exp => ({
      amount: exp.amount,
      isSplit: false, // Pot expenses are not split in this context, they reduce the pot directly
      splitWithMemberIds: [],
      paidByMemberId: undefined // Not relevant for pot expense share calculation
    }));

    const allHouseholdMemberIds = members.map(m => m.id);
    const netPositions = calculateNetFinancialPositions(memberInputs, expenseInputs, allHouseholdMemberIds);
    const memberData = netPositions.get(householdMemberId);

    return {
      directContributionToPot: memberData?.directContribution || 0,
      shareOfPotExpenses: memberData?.shareOfExpenses || 0,
      netPotShare: memberData?.netShare || 0,
    };
  }, [members, contributions, expenses, sharedBudgets, getMemberTotalContribution]);


  const _calculateAndStoreHouseholdSettlements = useCallback(() => {
    if (members.length === 0) {
      setHouseholdOverallSettlements([]);
      return;
    }
    const memberNetShares: NetPosition[] = members.map(m => {
        const data = getHouseholdMemberNetPotData(m.id);
        return { memberId: m.id, netShare: data.netPotShare, directContribution: data.directContributionToPot, shareOfExpenses: data.shareOfPotExpenses };
    });
    const rawSettlements = generateSettlements(memberNetShares);
    const finalSettlements: HouseholdSettlement[] = rawSettlements.map(s => ({
        ...s, id: uuidv4(), tripId: 'household_pot_settlement',
    }));
    setHouseholdOverallSettlements(finalSettlements);
  }, [members, getHouseholdMemberNetPotData, setHouseholdOverallSettlements]);

  const triggerHouseholdSettlementCalculation = useCallback(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [_calculateAndStoreHouseholdSettlements]);


  const addExpense = useCallback((newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...newExpenseData, id: uuidv4() };
    setExpenses(prev => [...prev, newExpense]);
    setDebts(prevDebts => _manageDebtsForExpense(newExpense, prevDebts));
    if (newExpense.sharedBudgetId || newExpense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID) {
      _calculateAndStoreHouseholdSettlements();
    }
  }, [setExpenses, setDebts, _manageDebtsForExpense, _calculateAndStoreHouseholdSettlements]);

  const updateExpense = useCallback((updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setDebts(prevDebts => _manageDebtsForExpense(updatedExpense, prevDebts));
    if (updatedExpense.sharedBudgetId || updatedExpense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID) {
       _calculateAndStoreHouseholdSettlements();
    }
  }, [setExpenses, setDebts, _manageDebtsForExpense, _calculateAndStoreHouseholdSettlements]);

  const deleteExpense = useCallback((expenseId: string) => {
    const expenseToDelete = expenses.find(exp => exp.id === expenseId); // Find before deleting
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== expenseId));
     if (expenseToDelete && (expenseToDelete.sharedBudgetId || expenseToDelete.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID)) {
       _calculateAndStoreHouseholdSettlements();
    }
  }, [expenses, setExpenses, setDebts, _calculateAndStoreHouseholdSettlements]);


  const addBudgetGoal = useCallback((goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setBudgetGoals(prev => [...prev, { ...goal, id: uuidv4(), currentSpending: 0 }]);
  }, [setBudgetGoals]);

  const updateBudgetGoal = useCallback((updatedGoal: BudgetGoal) => {
    setBudgetGoals(prev => prev.map(goal =>
        goal.id === updatedGoal.id ? { ...goal, ...updatedGoal } : goal
    ));
  }, [setBudgetGoals]);

  const deleteBudgetGoal = useCallback((goalId: string) => {
    setBudgetGoals(prev => prev.filter(goal => goal.id !== goalId));
  }, [setBudgetGoals]);


  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
    _calculateAndStoreHouseholdSettlements();
  }, [setMembers, _calculateAndStoreHouseholdSettlements]);

  const _deleteMemberContributionsAndDebts = useCallback((memberId: string) => {
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
  }, [setContributions, setDebts]);

  const deleteMember = useCallback((memberId: string) => {
    _deleteMemberContributionsAndDebts(memberId);
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
    _calculateAndStoreHouseholdSettlements();
  }, [setMembers, _deleteMemberContributionsAndDebts, _calculateAndStoreHouseholdSettlements]);

  const addContribution = useCallback((contribution: Omit<Contribution, 'id'>) => {
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
    _calculateAndStoreHouseholdSettlements();
  }, [setContributions, _calculateAndStoreHouseholdSettlements]);

  const getMemberContributions = useCallback((memberId: string): Contribution[] => {
    return contributions.filter(contrib => contrib.memberId === memberId);
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

  const getHouseholdOverallSettlements = useCallback((): HouseholdSettlement[] => {
    return householdOverallSettlements;
  }, [householdOverallSettlements]);


  const addSharedBudget = useCallback((budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => {
    const newSharedBudget: SharedBudget = {
      ...budget, id: uuidv4(), createdAt: formatISO(new Date()), currentSpending: 0,
    };
    setSharedBudgets(prev => [...prev, newSharedBudget]);
  }, [setSharedBudgets]);

  const updateSharedBudget = useCallback((updatedBudget: SharedBudget) => {
    setSharedBudgets(prev =>
      prev.map(budget => budget.id === updatedBudget.id ? { ...budget, ...updatedBudget } : budget)
    );
  }, [setSharedBudgets]);

  const deleteSharedBudget = useCallback((budgetId: string) => {
    setSharedBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    setExpenses(prevExpenses =>
      prevExpenses.map(exp => exp.sharedBudgetId === budgetId ? { ...exp, sharedBudgetId: undefined } : exp)
    );
    _calculateAndStoreHouseholdSettlements();
  }, [setSharedBudgets, setExpenses, _calculateAndStoreHouseholdSettlements]);


  const settleDebt = useCallback((debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: true, settledAt: formatISO(new Date()) } : d));
  }, [setDebts]);

  const unsettleDebt = useCallback((debtId: string) => {
     setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: false, settledAt: undefined } : d));
  }, [setDebts]);

  const getDebtsOwedByMember = useCallback((memberId: string, includeSettled: boolean = false) => {
    return debts.filter(d => d.owedByMemberId === memberId && (includeSettled || !d.isSettled));
  }, [debts]);

  const getDebtsOwedToMember = useCallback((memberId: string, includeSettled: boolean = false) => {
    return debts.filter(d => d.owedToMemberId === memberId && (includeSettled || !d.isSettled));
  }, [debts]);

  const getAllDebts = useCallback((includeSettled: boolean = false) => {
    return includeSettled ? debts : debts.filter(d => !d.isSettled);
  }, [debts]);


  const addShoppingListItem = useCallback((item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => {
    const newItem: ShoppingListItem = { ...item, id: uuidv4(), isPurchased: false, addedAt: formatISO(new Date()), };
    setShoppingListItems(prev => [...prev, newItem]);
  }, [setShoppingListItems]);

  const editShoppingListItem = useCallback((updatedItem: Pick<ShoppingListItem, 'id' | 'itemName' | 'quantity' | 'notes'>) => {
    setShoppingListItems(prev => prev.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item));
  }, [setShoppingListItems]);

  const toggleShoppingListItemPurchased = useCallback((itemId: string) => {
    setShoppingListItems(prev => prev.map(item => item.id === itemId ? { ...item, isPurchased: !item.isPurchased } : item));
  }, [setShoppingListItems]);

  const deleteShoppingListItem = useCallback((itemId: string) => {
    setShoppingListItems(prev => prev.filter(item => item.id !== itemId));
  }, [setShoppingListItems]);

  const copyLastWeeksPurchasedItems = useCallback(() => {
    const today = new Date();
    const fourteenDaysAgo = subDays(today, 14);
    const recentPurchasedItems = shoppingListItems.filter(item => {
      if (!item.isPurchased) return false;
      try {
        const addedDate = parseISO(item.addedAt);
        return isWithinInterval(addedDate, { start: fourteenDaysAgo, end: today });
      } catch (e) { return false; }
    });
    const currentUnpurchasedNames = shoppingListItems.filter(item => !item.isPurchased).map(item => item.itemName.toLowerCase());
    const itemsToAdd: ShoppingListItem[] = recentPurchasedItems
      .filter(item => !currentUnpurchasedNames.includes(item.itemName.toLowerCase()))
      .map(item => ({
        id: uuidv4(), itemName: item.itemName, quantity: item.quantity, notes: item.notes,
        isPurchased: false, addedAt: formatISO(new Date()),
      }));
    if (itemsToAdd.length > 0) {
      setShoppingListItems(prev => [...itemsToAdd, ...prev]);
    }
    return itemsToAdd.length;
  }, [shoppingListItems, setShoppingListItems]);


  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    const newTrip: Trip = { ...tripData, id: uuidv4(), createdAt: formatISO(new Date()), };
    setTrips(prev => [...prev, newTrip]);
  }, [setTrips]);

  const getTripById = useCallback((tripId: string): Trip | undefined => {
    return trips.find(trip => trip.id === tripId);
  }, [trips]);

  const getTrips = useCallback((): Trip[] => {
    return trips;
  }, [trips]);

  const getTripMemberById = useCallback((tripMemberId: string): TripMember | undefined => {
    return tripMembers.find(member => member.id === tripMemberId);
  }, [tripMembers]);


  const addTripMember = useCallback((tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => {
    const newTripMember: TripMember = { ...memberData, id: uuidv4(), tripId, };
    setTripMembers(prev => [...prev, newTripMember]);
    _calculateAndStoreTripSettlements(tripId);
  }, [setTripMembers, _calculateAndStoreTripSettlements]);

  const deleteTripMember = useCallback((tripMemberId: string, tripId: string) => {
    setTripMembers(prev => prev.filter(member => member.id !== tripMemberId));
    setTripContributions(prev => prev.filter(contrib => contrib.tripMemberId !== tripMemberId));
    setTripExpenses(prevExpenses => {
      return prevExpenses.map(exp => {
        if (exp.tripId === tripId) {
          const newSplitWith = exp.splitWithTripMemberIds?.filter(id => id !== tripMemberId);
          return { ...exp, paidByTripMemberId: exp.paidByTripMemberId === tripMemberId ? undefined : exp.paidByTripMemberId,
            splitWithTripMemberIds: newSplitWith, isSplit: !!(newSplitWith && newSplitWith.length > 0 && exp.isSplit)
          };
        }
        return exp;
      });
    });
    _calculateAndStoreTripSettlements(tripId);
  }, [setTripMembers, setTripContributions, setTripExpenses, _calculateAndStoreTripSettlements]);


  const addTripContribution = useCallback((tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => {
    const newTripContribution: TripContribution = {
      ...contributionData, id: uuidv4(), tripId, tripMemberId, date: formatISO(contributionData.date),
    };
    setTripContributions(prev => [...prev, newTripContribution]);
    _calculateAndStoreTripSettlements(tripId);
  }, [setTripContributions, _calculateAndStoreTripSettlements]);

  const getTripContributionsForMember = useCallback((tripMemberId: string): TripContribution[] => {
    return tripContributions.filter(contrib => contrib.tripMemberId === tripMemberId);
  }, [tripContributions]);


  const addTripExpense = useCallback((expenseData: Omit<TripExpense, 'id'>) => {
    const newTripExpense: TripExpense = { ...expenseData, id: uuidv4(), };
    setTripExpenses(prev => [...prev, newTripExpense]);
    _calculateAndStoreTripSettlements(expenseData.tripId);
  }, [setTripExpenses, _calculateAndStoreTripSettlements]);

  const getTripSettlements = useCallback((tripId: string): TripSettlement[] => {
    return tripSettlementsMap[tripId] || [];
  }, [tripSettlementsMap]);


  useEffect(() => {
    setBudgetGoals(prevGoals =>
      prevGoals.map(goal => {
        const relevantExpenses = expenses.filter(exp => exp.categoryId === goal.categoryId);
        const currentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return { ...goal, currentSpending };
      })
    );
  }, [expenses, setBudgetGoals]);

  useEffect(() => {
    setSharedBudgets(prevSharedBudgets => {
      let hasChanged = false;
      const newSharedBudgets = prevSharedBudgets.map(sharedBudget => {
        const relevantExpenses = expenses.filter(exp => exp.sharedBudgetId === sharedBudget.id);
        const newCurrentSpending = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        if (newCurrentSpending !== sharedBudget.currentSpending) hasChanged = true;
        return { ...sharedBudget, currentSpending: newCurrentSpending };
      });
      return hasChanged ? newSharedBudgets : prevSharedBudgets;
    });
  }, [expenses, setSharedBudgets]);

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

    