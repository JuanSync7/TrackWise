
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import type {
  HouseholdExpense, Category, Member, Contribution, ShoppingListItem, SharedBudget, Debt, HouseholdSettlement,
  CalculatedMemberFinancials, HouseholdContextType, MemberDisplayFinancials
} from '@/lib/types';
import { HOUSEHOLD_EXPENSE_CATEGORY_ID, POT_PAYER_ID } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, parseISO, subDays, isWithinInterval } from 'date-fns';
import { calculateNetFinancialPositions, generateSettlements, type MemberInput, type ExpenseInput } from '@/lib/financial-utils';

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const defaultMemberDisplayFinancials: MemberDisplayFinancials = {
  directCashContribution: 0,
  amountPersonallyPaidForGroup: 0,
  totalShareOfAllGroupExpenses: 0,
  netOverallPosition: 0,
};

export const HouseholdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useLocalStorage<Member[]>('trackwise_members', []);
  const [householdExpenses, setHouseholdExpenses] = useLocalStorage<HouseholdExpense[]>('trackwise_household_expenses', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_household_contributions', []);
  const [sharedBudgets, setSharedBudgets] = useLocalStorage<SharedBudget[]>('trackwise_shared_budgets', []);
  const [debts, setDebts] = useLocalStorage<Debt[]>('trackwise_household_debts', []);
  const [shoppingListItems, setShoppingListItems] = useLocalStorage<ShoppingListItem[]>('trackwise_shopping_list_items', []);
  
  const [householdFinancialSummaries, setHouseholdFinancialSummaries] = useLocalStorage<Record<string, CalculatedMemberFinancials>>('trackwise_household_financial_summaries', {});
  const [householdOverallSettlements, setHouseholdOverallSettlements] = useLocalStorage<HouseholdSettlement[]>('trackwise_household_settlements', []);

  const getMemberById = useCallback((memberId: string) => members.find(member => member.id === memberId), [members]);

  // Debt management for household expenses (inter-member, non-pot related initially)
  const _manageDebtsForHouseholdExpense = useCallback((expense: HouseholdExpense, currentDebts: Debt[]): Debt[] => {
    let updatedDebts = currentDebts.filter(d => d.expenseId !== expense.id);
    // Only generate debts if the expense was paid by an individual member (not the pot) and is split
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

  const addHouseholdExpense = useCallback((newExpenseData: Omit<HouseholdExpense, 'id'>) => {
    const newExpense = { ...newExpenseData, id: uuidv4() };
    setHouseholdExpenses(prev => [...prev, newExpense]);
    setDebts(prevDebts => _manageDebtsForHouseholdExpense(newExpense, prevDebts));
    // Note: Settlement calculation will be triggered by useEffect watching householdExpenses
  }, [setHouseholdExpenses, setDebts, _manageDebtsForHouseholdExpense]);

  const updateHouseholdExpense = useCallback((updatedExpense: HouseholdExpense) => {
    setHouseholdExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setDebts(prevDebts => _manageDebtsForHouseholdExpense(updatedExpense, prevDebts));
  }, [setHouseholdExpenses, setDebts, _manageDebtsForHouseholdExpense]);

  const deleteHouseholdExpense = useCallback((expenseId: string) => {
    setHouseholdExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== expenseId));
  }, [setHouseholdExpenses, setDebts]);

  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
  }, [setMembers]);

  const deleteMember = useCallback((memberId: string) => {
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
    // Also remove member from any expense splits if they were a payer or splittee
    setHouseholdExpenses(prevExpenses => prevExpenses.map(exp => {
      if (exp.paidByMemberId === memberId) { // If payer is deleted, assume pot paid or handle as per app logic
        return { ...exp, paidByMemberId: POT_PAYER_ID }; // Or undefined if pot payer not allowed
      }
      if (exp.splitWithMemberIds?.includes(memberId)) {
        const newSplitWith = exp.splitWithMemberIds.filter(id => id !== memberId);
        return { ...exp, splitWithMemberIds: newSplitWith, isSplit: newSplitWith.length > 0 ? exp.isSplit : false };
      }
      return exp;
    }));
  }, [setMembers, setContributions, setDebts, setHouseholdExpenses]);

  const addContribution = useCallback((contribution: Omit<Contribution, 'id'>) => { // To household pot
    setContributions(prev => [...prev, { ...contribution, id: uuidv4() }]);
  }, [setContributions]);

  const getMemberContributions = useCallback((memberId: string) => contributions.filter(contrib => contrib.memberId === memberId), [contributions]);
  const getMemberTotalContribution = useCallback((memberId: string) => contributions.filter(c => c.memberId === memberId).reduce((s, c) => s + c.amount, 0), [contributions]);

  const addSharedBudget = useCallback((budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => {
    const newSharedBudget: SharedBudget = { ...budget, id: uuidv4(), createdAt: formatISO(new Date()), currentSpending: 0 };
    setSharedBudgets(prev => [...prev, newSharedBudget]);
  }, [setSharedBudgets]);

  const updateSharedBudget = useCallback((updatedBudget: SharedBudget) => {
    setSharedBudgets(prev => prev.map(b => b.id === updatedBudget.id ? { ...b, ...updatedBudget } : b));
  }, [setSharedBudgets]);

  const deleteSharedBudget = useCallback((budgetId: string) => {
    setSharedBudgets(prev => prev.filter(b => b.id !== budgetId));
    setHouseholdExpenses(prevExp => prevExp.map(e => e.sharedBudgetId === budgetId ? { ...e, sharedBudgetId: undefined } : e));
  }, [setSharedBudgets, setHouseholdExpenses]);

  useEffect(() => { // Update shared budget spending when household expenses change
    setSharedBudgets(prevShared => prevShared.map(sb => ({
      ...sb, currentSpending: householdExpenses.filter(exp => exp.sharedBudgetId === sb.id).reduce((s, e) => s + e.amount, 0)
    })));
  }, [householdExpenses, setSharedBudgets]);


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

  const _calculateAndStoreHouseholdSettlements = useCallback(() => {
    if (members.length === 0) {
      setHouseholdFinancialSummaries({});
      setHouseholdOverallSettlements([]);
      return;
    }

    const memberInputs: MemberInput[] = members.map(m => ({
      id: m.id,
      directCashContribution: contributions.filter(c => c.memberId === m.id).reduce((s, c) => s + c.amount, 0),
    }));

    const expenseInputs: ExpenseInput[] = householdExpenses.map(exp => ({
      amount: exp.amount, isSplit: !!exp.isSplit,
      splitWithTripMemberIds: exp.splitWithMemberIds || [], paidByMemberId: exp.paidByMemberId,
    }));

    const householdMemberIds = members.map(m => m.id);
    const netPositionsMap = calculateNetFinancialPositions(memberInputs, expenseInputs, householdMemberIds);
    
    const newFinancialsMap: Record<string, CalculatedMemberFinancials> = {};
    netPositionsMap.forEach((value, key) => { newFinancialsMap[key] = value; });
    setHouseholdFinancialSummaries(newFinancialsMap);

    const netPositionsArray = Array.from(netPositionsMap.values());
    const rawSettlements = generateSettlements(netPositionsArray);
    const finalSettlements: HouseholdSettlement[] = rawSettlements.map(s => ({
      id: uuidv4(), owedByTripMemberId: s.owedByMemberId, owedToTripMemberId: s.owedToTripMemberId, amount: s.amount,
    }));
    setHouseholdOverallSettlements(finalSettlements);
  }, [members, contributions, householdExpenses, setHouseholdFinancialSummaries, setHouseholdOverallSettlements]);

  const triggerHouseholdSettlementCalculation = useCallback(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [_calculateAndStoreHouseholdSettlements]);

  useEffect(() => {
    triggerHouseholdSettlementCalculation();
  }, [members, contributions, householdExpenses, triggerHouseholdSettlementCalculation]);

  const getHouseholdMemberNetData = useCallback((memberId: string): MemberDisplayFinancials => {
    const financials = householdFinancialSummaries[memberId];
    if (financials) {
      return {
        directCashContribution: financials.directCashContribution,
        amountPersonallyPaidForGroup: financials.amountPersonallyPaidForGroup,
        totalShareOfAllGroupExpenses: financials.totalShareOfAllGroupExpenses,
        netOverallPosition: financials.finalNetShareForSettlement,
      };
    }
    return defaultMemberDisplayFinancials;
  }, [householdFinancialSummaries]);

  const value: HouseholdContextType = {
    members, householdExpenses, contributions, sharedBudgets, debts, shoppingListItems,
    householdFinancialSummaries, householdOverallSettlements,
    addMember, deleteMember, getMemberById,
    addHouseholdExpense, updateHouseholdExpense, deleteHouseholdExpense,
    addContribution, getMemberContributions, getMemberTotalContribution,
    addSharedBudget, updateSharedBudget, deleteSharedBudget,
    settleDebt, unsettleDebt, getDebtsOwedByMember, getDebtsOwedToMember, getAllDebts,
    addShoppingListItem, editShoppingListItem, toggleShoppingListItemPurchased, deleteShoppingListItem, copyLastWeeksPurchasedItems,
    getHouseholdMemberNetData, triggerHouseholdSettlementCalculation,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = (): HouseholdContextType => {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
