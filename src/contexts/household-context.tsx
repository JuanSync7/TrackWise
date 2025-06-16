
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import type {
  HouseholdTransaction, Member, Contribution, ShoppingListItem, SharedBudget, Debt, HouseholdSettlement,
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
  const [householdTransactions, setHouseholdTransactions] = useLocalStorage<HouseholdTransaction[]>('trackwise_household_transactions', []);
  const [contributions, setContributions] = useLocalStorage<Contribution[]>('trackwise_household_contributions', []);
  const [sharedBudgets, setSharedBudgets] = useLocalStorage<SharedBudget[]>('trackwise_shared_budgets', []);
  const [debts, setDebts] = useLocalStorage<Debt[]>('trackwise_household_debts', []);
  const [shoppingListItems, setShoppingListItems] = useLocalStorage<ShoppingListItem[]>('trackwise_shopping_list_items', []);
  
  const [householdFinancialSummaries, setHouseholdFinancialSummaries] = useLocalStorage<Record<string, CalculatedMemberFinancials>>('trackwise_household_financial_summaries', {});
  const [householdOverallSettlements, setHouseholdOverallSettlements] = useLocalStorage<HouseholdSettlement[]>('trackwise_household_settlements', []);

  const getMemberById = useCallback((memberId: string) => members.find(member => member.id === memberId), [members]);

  const _manageDebtsForHouseholdTransaction = useCallback((transaction: HouseholdTransaction, currentDebts: Debt[]): Debt[] => {
    let updatedDebts = currentDebts.filter(d => d.expenseId !== transaction.id);
    if (transaction.transactionType === 'expense' && transaction.isSplit && transaction.paidByMemberId && transaction.paidByMemberId !== POT_PAYER_ID && transaction.splitWithMemberIds && transaction.splitWithMemberIds.length > 0) {
      
      if (transaction.splitType === 'custom' && transaction.customSplitAmounts && transaction.customSplitAmounts.length > 0) {
        transaction.customSplitAmounts.forEach(customSplit => {
          if (customSplit.memberId !== transaction.paidByMemberId && customSplit.amount > 0) {
            updatedDebts.push({
              id: uuidv4(), expenseId: transaction.id, expenseDescription: transaction.description,
              amount: parseFloat(customSplit.amount.toFixed(2)), owedByMemberId: customSplit.memberId,
              owedToMemberId: transaction.paidByMemberId!, isSettled: false, createdAt: formatISO(new Date()),
            });
          }
        });
      } else { 
        const amountPerPerson = transaction.amount / transaction.splitWithMemberIds!.length;
        transaction.splitWithMemberIds.forEach(memberIdInSplit => {
          if (memberIdInSplit !== transaction.paidByMemberId) {
            updatedDebts.push({
              id: uuidv4(), expenseId: transaction.id, expenseDescription: transaction.description,
              amount: parseFloat(amountPerPerson.toFixed(2)), owedByMemberId: memberIdInSplit,
              owedToMemberId: transaction.paidByMemberId!, isSettled: false, createdAt: formatISO(new Date()),
            });
          }
        });
      }
    }
    return updatedDebts;
  }, []);

  const addHouseholdTransaction = useCallback((newTransactionData: Omit<HouseholdTransaction, 'id'>) => {
    const newTransaction = { ...newTransactionData, id: uuidv4() };
    setHouseholdTransactions(prev => [...prev, newTransaction]);
    if (newTransaction.transactionType === 'expense') {
      setDebts(prevDebts => _manageDebtsForHouseholdTransaction(newTransaction, prevDebts));
    }
  }, [setHouseholdTransactions, setDebts, _manageDebtsForHouseholdTransaction]);

  const updateHouseholdTransaction = useCallback((updatedTransaction: HouseholdTransaction) => {
    setHouseholdTransactions(prev => prev.map(trans => trans.id === updatedTransaction.id ? updatedTransaction : trans));
    if (updatedTransaction.transactionType === 'expense') {
      setDebts(prevDebts => _manageDebtsForHouseholdTransaction(updatedTransaction, prevDebts));
    } else {
      setDebts(prevDebts => prevDebts.filter(d => d.expenseId !== updatedTransaction.id));
    }
  }, [setHouseholdTransactions, setDebts, _manageDebtsForHouseholdTransaction]);

  const deleteHouseholdTransaction = useCallback((transactionId: string) => {
    setHouseholdTransactions(prev => prev.filter(trans => trans.id !== transactionId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.expenseId !== transactionId));
  }, [setHouseholdTransactions, setDebts]);

  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: uuidv4() }]);
  }, [setMembers]);

  const deleteMember = useCallback((memberId: string) => {
    setMembers(prev => prev.filter(mem => mem.id !== memberId));
    setContributions(prev => prev.filter(contrib => contrib.memberId !== memberId));
    setDebts(prevDebts => prevDebts.filter(debt => debt.owedByMemberId !== memberId && debt.owedToMemberId !== memberId));
    setHouseholdTransactions(prevTransactions => prevTransactions.map(trans => {
      let updatedTrans = { ...trans };
      if (updatedTrans.paidByMemberId === memberId) {
        updatedTrans.paidByMemberId = POT_PAYER_ID;
      }
      if (updatedTrans.splitWithMemberIds?.includes(memberId)) {
        updatedTrans.splitWithMemberIds = updatedTrans.splitWithMemberIds.filter(id => id !== memberId);
        if (updatedTrans.splitWithMemberIds.length === 0) updatedTrans.isSplit = false;
      }
      if (updatedTrans.customSplitAmounts?.some(cs => cs.memberId === memberId)) {
        updatedTrans.customSplitAmounts = updatedTrans.customSplitAmounts.filter(cs => cs.memberId !== memberId);
        if (updatedTrans.customSplitAmounts.length === 0 && updatedTrans.splitType === 'custom') {
            updatedTrans.splitType = 'even';
        }
      }
      return updatedTrans;
    }));
  }, [setMembers, setContributions, setDebts, setHouseholdTransactions]);

  const addContribution = useCallback((contribution: Omit<Contribution, 'id'>) => {
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
    setHouseholdTransactions(prevTrans => prevTrans.map(e => e.sharedBudgetId === budgetId ? { ...e, sharedBudgetId: undefined } : e));
  }, [setSharedBudgets, setHouseholdTransactions]);

  useEffect(() => {
    setSharedBudgets(prevShared => prevShared.map(sb => ({
      ...sb, currentSpending: householdTransactions.filter(trans => trans.transactionType === 'expense' && trans.sharedBudgetId === sb.id).reduce((s, e) => s + e.amount, 0)
    })));
  }, [householdTransactions, setSharedBudgets]);


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

    const expenseTypeTransactions = householdTransactions.filter(t => t.transactionType === 'expense');
    const expenseInputs: ExpenseInput[] = expenseTypeTransactions.map(exp => ({
      amount: exp.amount, 
      isSplit: !!exp.isSplit,
      splitWithTripMemberIds: exp.splitWithMemberIds || [],
      paidByMemberId: exp.paidByMemberId,
      splitType: exp.splitType,
      customSplitAmounts: exp.customSplitAmounts?.map(cs => ({memberId: cs.memberId, amount: cs.amount}))
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
  }, [members, contributions, householdTransactions, setHouseholdFinancialSummaries, setHouseholdOverallSettlements]);

  const triggerHouseholdSettlementCalculation = useCallback(() => {
    _calculateAndStoreHouseholdSettlements();
  }, [_calculateAndStoreHouseholdSettlements]);

  useEffect(() => {
    triggerHouseholdSettlementCalculation();
  }, [members, contributions, householdTransactions, triggerHouseholdSettlementCalculation]); 

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

  const value = useMemo(() => ({
    members, householdTransactions, contributions, sharedBudgets, debts, shoppingListItems, 
    householdFinancialSummaries, householdOverallSettlements,
    addMember, deleteMember, getMemberById,
    addHouseholdTransaction, updateHouseholdTransaction, deleteHouseholdTransaction, 
    addContribution, getMemberContributions, getMemberTotalContribution,
    addSharedBudget, updateSharedBudget, deleteSharedBudget,
    settleDebt, unsettleDebt, getDebtsOwedByMember, getDebtsOwedToMember, getAllDebts,
    addShoppingListItem, editShoppingListItem, toggleShoppingListItemPurchased, deleteShoppingListItem, copyLastWeeksPurchasedItems,
    getHouseholdMemberNetData, triggerHouseholdSettlementCalculation,
  }), [
    members, householdTransactions, contributions, sharedBudgets, debts, shoppingListItems, 
    householdFinancialSummaries, householdOverallSettlements,
    addMember, deleteMember, getMemberById,
    addHouseholdTransaction, updateHouseholdTransaction, deleteHouseholdTransaction, 
    addContribution, getMemberContributions, getMemberTotalContribution,
    addSharedBudget, updateSharedBudget, deleteSharedBudget,
    settleDebt, unsettleDebt, getDebtsOwedByMember, getDebtsOwedToMember, getAllDebts,
    addShoppingListItem, editShoppingListItem, toggleShoppingListItemPurchased, deleteShoppingListItem, copyLastWeeksPurchasedItems,
    getHouseholdMemberNetData, triggerHouseholdSettlementCalculation,
  ]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = (): HouseholdContextType => {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
