
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import type {
  Expense, Category, BudgetGoal, AppState, AppContextType,
  Member, Contribution, ShoppingListItem, SharedBudget, Debt, HouseholdMemberNetData, HouseholdSettlement,
  Trip, TripMember, TripContribution, TripExpense, TripMemberNetData as TripMemberNetDataType, TripSettlement
} from '@/lib/types';
import { INITIAL_CATEGORIES, HOUSEHOLD_EXPENSE_CATEGORY_ID, POT_PAYER_ID } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, parseISO, subDays, isWithinInterval } from 'date-fns';
import { calculateNetFinancialPositions, generateSettlements, type MemberInput, type ExpenseInput, type CalculatedMemberFinancials } from '@/lib/financial-utils';


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('trackwise_expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('trackwise_categories', INITIAL_CATEGORIES);
  const [budgetGoals, setBudgetGoals] = useLocalStorage<BudgetGoal[]>('trackwise_budget_goals', []);
  const [members, setMembers] = useLocalStorage<Member[]>('trackwise_members', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_contributions', []); // Household cash contributions
  const [sharedBudgets, setSharedBudgets] = useLocalStorage<SharedBudget[]>('trackwise_shared_budgets', []);
  const [debts, setDebts] = useLocalStorage<Debt[]>('trackwise_debts', []);
  const [householdOverallSettlements, setHouseholdOverallSettlements] = useLocalStorage<HouseholdSettlement[]>('trackwise_household_settlements', []);
  const [shoppingListItems, setShoppingListItems] = useLocalStorage<ShoppingListItem[]>('trackwise_shopping_list_items', []);
  const [trips, setTrips] = useLocalStorage<Trip[]>('trackwise_trips', []);
  const [tripMembers, setTripMembers] = useLocalStorage<TripMember[]>('trackwise_trip_members', []);
  const [tripContributions, setTripContributions] = useLocalStorage<TripContribution[]>('trackwise_trip_contributions', []); // Trip cash contributions
  const [tripExpenses, setTripExpensesState] = useLocalStorage<TripExpense[]>('trackwise_trip_expenses', []);
  const [tripSettlementsMap, setTripSettlementsMap] = useLocalStorage<Record<string, TripSettlement[]>>('trackwise_trip_settlements_map', {});


  const getMemberById = useCallback((memberId: string) => members.find(member => member.id === memberId), [members]);
  const getCategoryById = useCallback((categoryId: string) => categories.find(cat => cat.id === categoryId), [categories]);
  const getTripById = useCallback((tripId: string) => trips.find(trip => trip.id === tripId), [trips]);
  const getTrips = useCallback(() => trips, [trips]);
  const getTripMembers = useCallback((tripId: string) => tripMembers.filter(member => member.tripId === tripId), [tripMembers]);
  const getTripMemberById = useCallback((tripMemberId: string) => tripMembers.find(member => member.id === tripMemberId), [tripMembers]);
  const getTripExpenses = useCallback((tripIdToFilter: string) => tripExpenses.filter(expense => expense.tripId === tripIdToFilter), [tripExpenses]);
  const getHouseholdOverallSettlements = useCallback(() => householdOverallSettlements, [householdOverallSettlements]);
  const getTripSettlements = useCallback((tripId: string) => tripSettlementsMap[tripId] || [], [tripSettlementsMap]);

  const _manageDebtsForExpense = useCallback((expense: Expense, currentDebts: Debt[]): Debt[] => {
    let updatedDebts = currentDebts.filter(d => d.expenseId !== expense.id);
    if (expense.isSplit && expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID && expense.splitWithMemberIds && expense.splitWithMemberIds.length > 0) {
      const amountPerPerson = expense.amount / expense.splitWithMemberIds.length;
      expense.splitWithMemberIds.forEach(memberIdInSplit => {
        if (memberIdInSplit !== expense.paidByMemberId) {
          updatedDebts.push({
            id: uuidv4(), expenseId: expense.id, expenseDescription: expense.description,
            amount: parseFloat(amountPerPerson.toFixed(2)), owedByMemberId: memberIdInSplit,
            owedToMemberId: expense.paidByMemberId!, isSettled: false, createdAt: formatISO(new Date()),
          });
        }
      });
    }
    return updatedDebts;
  }, []);

  const _deleteMemberContributionsAndDebts = useCallback((memberId: string) => {
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
  }, [setContributions, setDebts]);


  const getHouseholdMemberNetPotData = useCallback((householdMemberId: string): HouseholdMemberNetData => {
    const memberInputs: MemberInput[] = members.map(m => ({
      id: m.id,
      directCashContribution: contributions.filter(c => c.memberId === m.id).reduce((s, c) => s + c.amount, 0),
    }));
    const expenseInputs: ExpenseInput[] = expenses.map(exp => ({
      amount: exp.amount, isSplit: !!exp.isSplit,
      splitWithMemberIds: exp.splitWithMemberIds || [], paidByMemberId: exp.paidByMemberId,
    }));
    const allHouseholdMemberIds = members.map(m => m.id);
    const netPositions = calculateNetFinancialPositions(memberInputs, expenseInputs, allHouseholdMemberIds);
    
    const memberData = netPositions.get(householdMemberId);
    if (memberData) {
      return {
        directCashContribution: memberData.directCashContribution,
        amountPersonallyPaidForGroup: memberData.amountPersonallyPaidForGroup,
        totalShareOfAllGroupExpenses: memberData.totalShareOfAllGroupExpenses,
        netOverallPosition: memberData.finalNetShareForSettlement,
      };
    }
    return { directCashContribution: 0, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 0, netOverallPosition: 0 };
  }, [members, contributions, expenses]);


  const getTripMemberNetData = useCallback((tripId: string, tripMemberId: string): TripMemberNetDataType => {
    const currentTripMembers = getTripMembers(tripId);
    if (currentTripMembers.length === 0) return { directCashContribution: 0, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 0, netOverallPosition: 0 };

    const memberInputs: MemberInput[] = currentTripMembers.map(tm => ({
      id: tm.id,
      directCashContribution: tripContributions.filter(tc => tc.tripMemberId === tm.id && tc.tripId === tripId).reduce((sum, tc) => sum + tc.amount, 0),
    }));

    const expensesForThisTrip = getTripExpenses(tripId);
    const expenseInputs: ExpenseInput[] = expensesForThisTrip.map(exp => ({
      amount: exp.amount,
      isSplit: !!exp.isSplit,
      splitWithMemberIds: exp.splitWithTripMemberIds || [],
      paidByMemberId: exp.paidByTripMemberId,
    }));
    
    const allTripMemberIds = currentTripMembers.map(tm => tm.id);
    const netPositions = calculateNetFinancialPositions(memberInputs, expenseInputs, allTripMemberIds);
    const memberData = netPositions.get(tripMemberId);

    if (memberData) {
      return {
        directCashContribution: memberData.directCashContribution,
        amountPersonallyPaidForGroup: memberData.amountPersonallyPaidForGroup,
        totalShareOfAllGroupExpenses: memberData.totalShareOfAllGroupExpenses,
        netOverallPosition: memberData.finalNetShareForSettlement,
      };
    }
    return { directCashContribution: 0, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 0, netOverallPosition: 0 };
  }, [getTripMembers, tripContributions, getTripExpenses]);


  const _calculateAndStoreHouseholdSettlements = useCallback(() => {
    if (members.length === 0) {
      setHouseholdOverallSettlements([]);
      return;
    }
    const memberInputs: MemberInput[] = members.map(m => ({
      id: m.id,
      directCashContribution: contributions.filter(c => c.memberId === m.id).reduce((s, c) => s + c.amount, 0),
    }));
    const expenseInputs: ExpenseInput[] = expenses.map(exp => ({
      amount: exp.amount, isSplit: !!exp.isSplit,
      splitWithMemberIds: exp.splitWithMemberIds || [], paidByMemberId: exp.paidByMemberId,
    }));
    const householdMemberIds = members.map(m => m.id);
    const netPositionsMap = calculateNetFinancialPositions(memberInputs, expenseInputs, householdMemberIds);
    const netPositionsArray: CalculatedMemberFinancials[] = Array.from(netPositionsMap.values());

    const rawSettlements = generateSettlements(netPositionsArray);
    const finalSettlements: HouseholdSettlement[] = rawSettlements.map(s => ({
        ...s, id: uuidv4(), tripId: 'household_pot_settlement', // tripId is a generic group ID here
    }));
    setHouseholdOverallSettlements(finalSettlements);
  }, [members, contributions, expenses, setHouseholdOverallSettlements]);

  const triggerHouseholdSettlementCalculation = useCallback(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [_calculateAndStoreHouseholdSettlements]);


  const _calculateAndStoreTripSettlements = useCallback((tripId: string) => {
    const currentTripMembers = getTripMembers(tripId);
    if (currentTripMembers.length === 0) {
      setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: [] }));
      return;
    }
    const memberInputs: MemberInput[] = currentTripMembers.map(tm => ({
      id: tm.id,
      directCashContribution: tripContributions.filter(tc => tc.tripMemberId === tm.id && tc.tripId === tripId).reduce((s, tc) => s + tc.amount, 0),
    }));
    const expensesForThisTrip = getTripExpenses(tripId);
    const expenseInputs: ExpenseInput[] = expensesForThisTrip.map(exp => ({
      amount: exp.amount, isSplit: !!exp.isSplit,
      splitWithMemberIds: exp.splitWithTripMemberIds || [], paidByMemberId: exp.paidByTripMemberId,
    }));
    const allTripMemberIds = currentTripMembers.map(tm => tm.id);
    const netPositionsMap = calculateNetFinancialPositions(memberInputs, expenseInputs, allTripMemberIds);
    const netPositionsArray: CalculatedMemberFinancials[] = Array.from(netPositionsMap.values());
    
    const rawSettlements = generateSettlements(netPositionsArray);
    const finalSettlements: TripSettlement[] = rawSettlements.map(s => ({
        ...s, id: uuidv4(), tripId: tripId,
    }));
    setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: finalSettlements }));
  }, [getTripMembers, tripContributions, getTripExpenses, setTripSettlementsMap]);

  const triggerTripSettlementCalculation = useCallback((tripId: string) => {
    _calculateAndStoreTripSettlements(tripId);
  }, [_calculateAndStoreTripSettlements]);


  const addExpense = useCallback((newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...newExpenseData, id: uuidv4() };
    setExpenses(prev => [...prev, newExpense]);
    setDebts(prevDebts => _manageDebtsForExpense(newExpense, prevDebts));
  }, [setExpenses, setDebts, _manageDebtsForExpense]);

  const updateExpense = useCallback((updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setDebts(prevDebts => _manageDebtsForExpense(updatedExpense, prevDebts));
  }, [setExpenses, setDebts, _manageDebtsForExpense]);

  const deleteExpense = useCallback((expenseId: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== expenseId));
  }, [setExpenses, setDebts]);


  const addBudgetGoal = useCallback((goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setBudgetGoals(prev => [...prev, { ...goal, id: uuidv4(), currentSpending: 0 }]);
  }, [setBudgetGoals]);

  const updateBudgetGoal = useCallback((updatedGoal: BudgetGoal) => {
    setBudgetGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? { ...goal, ...updatedGoal } : goal ));
  }, [setBudgetGoals]);

  const deleteBudgetGoal = useCallback((goalId: string) => {
    setBudgetGoals(prev => prev.filter(goal => goal.id !== goalId));
  }, [setBudgetGoals]);

  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
  }, [setMembers]);

  const deleteMember = useCallback((memberId: string) => {
    _deleteMemberContributionsAndDebts(memberId);
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
  }, [setMembers, _deleteMemberContributionsAndDebts]);

  const addContribution = useCallback((contribution: Omit<Contribution, 'id'>) => {
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
  }, [setContributions]);

  const getMemberContributions = useCallback((memberId: string) => contributions.filter(contrib => contrib.memberId === memberId), [contributions]);
  const getMemberTotalContribution = useCallback((memberId: string) => contributions.filter(c => c.memberId === memberId).reduce((s, c) => s + c.amount, 0), [contributions]);

  const getTotalHouseholdSpending = useCallback(() => { // Total actual cash spent from the pot
    return expenses.filter(exp => exp.paidByMemberId === POT_PAYER_ID).reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);


  const addSharedBudget = useCallback((budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => {
    const newSharedBudget: SharedBudget = { ...budget, id: uuidv4(), createdAt: formatISO(new Date()), currentSpending: 0 };
    setSharedBudgets(prev => [...prev, newSharedBudget]);
  }, [setSharedBudgets]);

  const updateSharedBudget = useCallback((updatedBudget: SharedBudget) => {
    setSharedBudgets(prev => prev.map(b => b.id === updatedBudget.id ? { ...b, ...updatedBudget } : b));
  }, [setSharedBudgets]);

  const deleteSharedBudget = useCallback((budgetId: string) => {
    setSharedBudgets(prev => prev.filter(b => b.id !== budgetId));
    setExpenses(prevExp => prevExp.map(e => e.sharedBudgetId === budgetId ? { ...e, sharedBudgetId: undefined } : e));
  }, [setSharedBudgets, setExpenses]);

  const settleDebt = useCallback((debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: true, settledAt: formatISO(new Date()) } : d));
  }, [setDebts]);

  const unsettleDebt = useCallback((debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isSettled: false, settledAt: undefined } : d));
  }, [setDebts]);

  const getDebtsOwedByMember = useCallback((memberId: string, includeSettled: boolean = false) => debts.filter(d => d.owedByMemberId === memberId && (includeSettled || !d.isSettled)), [debts]);
  const getDebtsOwedToMember = useCallback((memberId: string, includeSettled: boolean = false) => debts.filter(d => d.owedToMemberId === memberId && (includeSettled || !d.isSettled)), [debts]);
  const getAllDebts = useCallback((includeSettled: boolean = false) => includeSettled ? debts : debts.filter(d => !d.isSettled), [debts]);

  const addShoppingListItem = useCallback((item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => {
    setShoppingListItems(prev => [...prev, { ...item, id: uuidv4(), isPurchased: false, addedAt: formatISO(new Date()) }]);
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
    const fourteenDaysAgo = subDays(new Date(), 14);
    const recentPurchased = shoppingListItems.filter(item => item.isPurchased && isWithinInterval(parseISO(item.addedAt), { start: fourteenDaysAgo, end: new Date() }));
    const currentUnpurchasedNames = shoppingListItems.filter(i => !i.isPurchased).map(i => i.itemName.toLowerCase());
    const itemsToAdd = recentPurchased
      .filter(item => !currentUnpurchasedNames.includes(item.itemName.toLowerCase()))
      .map(item => ({ ...item, id: uuidv4(), isPurchased: false, addedAt: formatISO(new Date()) }));
    if (itemsToAdd.length > 0) setShoppingListItems(prev => [...itemsToAdd, ...prev]);
    return itemsToAdd.length;
  }, [shoppingListItems, setShoppingListItems]);

  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    setTrips(prev => [...prev, { ...tripData, id: uuidv4(), createdAt: formatISO(new Date()) }]);
  }, [setTrips]);

  const addTripMember = useCallback((tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => {
    setTripMembers(prev => [...prev, { ...memberData, id: uuidv4(), tripId }]);
  }, [setTripMembers]);

  const deleteTripMember = useCallback((tripMemberId: string, tripId: string) => {
    setTripMembers(prev => prev.filter(member => member.id !== tripMemberId));
    setTripContributions(prevContributions => prevContributions.filter(contrib => contrib.tripMemberId !== tripMemberId || contrib.tripId !== tripId));
    setTripExpensesState(prevExpenses => prevExpenses.map(exp => {
      if (exp.tripId === tripId) {
        const newSplitWith = exp.splitWithTripMemberIds?.filter(id => id !== tripMemberId);
        return { ...exp, paidByTripMemberId: exp.paidByTripMemberId === tripMemberId ? undefined : exp.paidByTripMemberId,
                 splitWithTripMemberIds: newSplitWith, isSplit: !!(newSplitWith && newSplitWith.length > 0 && exp.isSplit) };
      }
      return exp;
    }));
  }, [setTripMembers, setTripContributions, setTripExpensesState]);

  const addTripContribution = useCallback((tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => {
    const newContrib: TripContribution = { ...contributionData, id: uuidv4(), tripId, tripMemberId, date: formatISO(contributionData.date) };
    setTripContributions(prev => [...prev, newContrib]);
  }, [setTripContributions]);

  const getTripContributionsForMember = useCallback((tripMemberId: string) => tripContributions.filter(c => c.tripMemberId === tripMemberId), [tripContributions]);
  
  const getTripMemberTotalDirectContribution = useCallback((tripMemberId: string, tripIdToFilter?: string) =>
    tripContributions.filter(tc => tc.tripMemberId === tripMemberId && (!tripIdToFilter || tc.tripId === tripIdToFilter)).reduce((s, tc) => s + tc.amount, 0),
  [tripContributions]);

  const addTripExpense = useCallback((expenseData: Omit<TripExpense, 'id'>) => {
    setTripExpensesState(prev => [...prev, { ...expenseData, id: uuidv4() }]);
  }, [setTripExpensesState]);


  useEffect(() => {
    setBudgetGoals(prevGoals => prevGoals.map(goal => ({
      ...goal, currentSpending: expenses.filter(exp => exp.categoryId === goal.categoryId).reduce((s, e) => s + e.amount, 0)
    })));
  }, [expenses, setBudgetGoals]);

  useEffect(() => {
    setSharedBudgets(prevShared => prevShared.map(sb => ({
      ...sb, currentSpending: expenses.filter(exp => exp.sharedBudgetId === sb.id).reduce((s, e) => s + e.amount, 0)
    })));
  }, [expenses, setSharedBudgets]);


  const value: AppContextType = {
    expenses, categories, budgetGoals, members, contributions, sharedBudgets, debts,
    shoppingListItems, trips, tripMembers, tripContributions, tripExpenses,
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
