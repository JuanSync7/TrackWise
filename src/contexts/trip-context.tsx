
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type {
  Trip, TripMember, TripContribution, TripExpense, TripSettlement,
  CalculatedMemberFinancials, TripContextType, MemberDisplayFinancials
} from '@/lib/types';
import { POT_PAYER_ID } from '@/lib/constants';
import useLocalStorage from '@/hooks/use-local-storage';
import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';
import { calculateNetFinancialPositions, generateSettlements, type MemberInput, type ExpenseInput } from '@/lib/financial-utils';

const TripContext = createContext<TripContextType | undefined>(undefined);

const defaultMemberDisplayFinancials: MemberDisplayFinancials = {
  directCashContribution: 0,
  amountPersonallyPaidForGroup: 0,
  totalShareOfAllGroupExpenses: 0,
  netOverallPosition: 0,
};

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useLocalStorage<Trip[]>('trackwise_trips', []);
  const [tripMembers, setTripMembersState] = useLocalStorage<TripMember[]>('trackwise_trip_members', []);
  const [tripContributions, setTripContributionsState] = useLocalStorage<TripContribution[]>('trackwise_trip_contributions', []);
  const [tripExpenses, setTripExpensesState] = useLocalStorage<TripExpense[]>('trackwise_trip_expenses', []);
  
  const [tripFinancialSummaries, setTripFinancialSummaries] = useLocalStorage<Record<string, Record<string, CalculatedMemberFinancials>>>('trackwise_trip_financial_summaries', {});
  const [tripSettlementsMap, setTripSettlementsMap] = useLocalStorage<Record<string, TripSettlement[]>>('trackwise_trip_settlements_map', {});

  const getTripById = useCallback((tripId: string) => trips.find(trip => trip.id === tripId), [trips]);
  const getTrips = useCallback(() => trips, [trips]);
  const getTripMembers = useCallback((tripId: string): TripMember[] => tripMembers.filter(member => member.tripId === tripId), [tripMembers]);
  const getTripMemberById = useCallback((tripMemberId: string) => tripMembers.find(member => member.id === tripMemberId), [tripMembers]);
  const getTripExpenses = useCallback((tripIdToFilter: string): TripExpense[] => tripExpenses.filter(expense => expense.tripId === tripIdToFilter), [tripExpenses]);
  const getTripSettlements = useCallback((tripId: string) => tripSettlementsMap[tripId] || [], [tripSettlementsMap]);

  const _calculateAndStoreTripSettlements = useCallback((tripId: string) => {
    const currentTripMembersForCalc = tripMembers.filter(tm => tm.tripId === tripId);
    if (currentTripMembersForCalc.length === 0) {
      setTripFinancialSummaries(prevMap => {
        const newMap = { ...prevMap }; delete newMap[tripId]; return newMap;
      });
      setTripSettlementsMap(prevMap => {
        const newMap = { ...prevMap }; delete newMap[tripId]; return newMap;
      });
      return;
    }

    const memberInputs: MemberInput[] = currentTripMembersForCalc.map(tm => ({
      id: tm.id,
      directCashContribution: tripContributions.filter(tc => tc.tripMemberId === tm.id && tc.tripId === tripId)
        .reduce((sum, tc) => sum + tc.amount, 0),
    }));

    const expensesForThisTrip = tripExpenses.filter(te => te.tripId === tripId);
    const expenseInputs: ExpenseInput[] = expensesForThisTrip.map(exp => ({
      amount: exp.amount, isSplit: !!exp.isSplit,
      splitWithTripMemberIds: exp.splitWithTripMemberIds || [], paidByMemberId: exp.paidByTripMemberId,
    }));
    
    const allTripMemberIdsForCalc = currentTripMembersForCalc.map(tm => tm.id);
    const netPositionsMap = calculateNetFinancialPositions(memberInputs, expenseInputs, allTripMemberIdsForCalc);

    const newFinancialsMapForTrip: Record<string, CalculatedMemberFinancials> = {};
    netPositionsMap.forEach((value, key) => { newFinancialsMapForTrip[key] = value; });
    setTripFinancialSummaries(prev => ({ ...prev, [tripId]: newFinancialsMapForTrip }));
    
    const netPositionsArray = Array.from(netPositionsMap.values());
    const rawSettlements = generateSettlements(netPositionsArray);
    const finalSettlements: TripSettlement[] = rawSettlements.map(s => ({
      ...s, id: uuidv4(), tripId: tripId,
    }));
    setTripSettlementsMap(prevMap => ({ ...prevMap, [tripId]: finalSettlements }));
  }, [tripMembers, tripContributions, tripExpenses, setTripFinancialSummaries, setTripSettlementsMap]);

  const triggerTripSettlementCalculation = useCallback((tripId: string) => {
    _calculateAndStoreTripSettlements(tripId);
  }, [_calculateAndStoreTripSettlements]);

  useEffect(() => { // Recalculate all trip settlements if global trip-related data changes
    trips.forEach(trip => triggerTripSettlementCalculation(trip.id));
  }, [tripMembers, tripContributions, tripExpenses, trips, triggerTripSettlementCalculation]);


  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    setTrips(prev => [...prev, { ...tripData, id: uuidv4(), createdAt: formatISO(new Date()) }]);
  }, [setTrips]);

  const addTripMember = useCallback((tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => {
    setTripMembersState(prev => [...prev, { ...memberData, id: uuidv4(), tripId }]);
  }, [setTripMembersState]);

  const deleteTripMember = useCallback((tripMemberId: string, tripId: string) => {
    setTripMembersState(prev => prev.filter(member => member.id !== tripMemberId));
    setTripContributionsState(prevContributions => prevContributions.filter(contrib => contrib.tripMemberId !== tripMemberId || contrib.tripId !== tripId));
    setTripExpensesState(prevExpenses => prevExpenses.map(exp => {
      if (exp.tripId === tripId) {
        const newSplitWith = exp.splitWithTripMemberIds?.filter(id => id !== tripMemberId);
        return { ...exp, paidByTripMemberId: exp.paidByTripMemberId === tripMemberId ? POT_PAYER_ID : exp.paidByTripMemberId,
                 splitWithTripMemberIds: newSplitWith, isSplit: !!(newSplitWith && newSplitWith.length > 0 && exp.isSplit) };
      }
      return exp;
    }));
    // Settlement recalculation is handled by useEffect watching tripMembers, etc.
  }, [setTripMembersState, setTripContributionsState, setTripExpensesState]);

  const addTripContribution = useCallback((tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => {
    const newContrib: TripContribution = { ...contributionData, id: uuidv4(), tripId, tripMemberId, date: formatISO(contributionData.date) };
    setTripContributionsState(prev => [...prev, newContrib]);
  }, [setTripContributionsState]);

  const getTripContributionsForMember = useCallback((tripMemberId: string, tripId?: string) => 
    tripContributions.filter(c => c.tripMemberId === tripMemberId && (tripId ? c.tripId === tripId : true)), 
  [tripContributions]);
  
  const getTripMemberTotalDirectContribution = useCallback((tripMemberId: string, tripIdToFilter?: string) =>
    tripContributions.filter(tc => tc.tripMemberId === tripMemberId && (!tripIdToFilter || tc.tripId === tripIdToFilter)).reduce((s, tc) => s + tc.amount, 0),
  [tripContributions]);

  const addTripExpense = useCallback((expenseData: Omit<TripExpense, 'id'>) => {
    setTripExpensesState(prev => [...prev, { ...expenseData, id: uuidv4() }]);
  }, [setTripExpensesState]);

  const updateTripExpense = useCallback((updatedExpense: TripExpense) => { // Added
    setTripExpensesState(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
  }, [setTripExpensesState]);

  const deleteTripExpense = useCallback((expenseId: string) => { // Added
    setTripExpensesState(prev => prev.filter(exp => exp.id !== expenseId));
  }, [setTripExpensesState]);

  const getTripMemberNetData = useCallback((tripId: string, tripMemberId: string): MemberDisplayFinancials => {
    const financials = tripFinancialSummaries[tripId]?.[tripMemberId];
    if (financials) {
      return {
        directCashContribution: financials.directCashContribution,
        amountPersonallyPaidForGroup: financials.amountPersonallyPaidForGroup,
        totalShareOfAllGroupExpenses: financials.totalShareOfAllGroupExpenses,
        netOverallPosition: financials.finalNetShareForSettlement,
      };
    }
    return defaultMemberDisplayFinancials;
  }, [tripFinancialSummaries]);

  const value: TripContextType = {
    trips, tripMembers, tripContributions, tripExpenses,
    tripFinancialSummaries, tripSettlementsMap,
    addTrip, getTripById, getTrips,
    addTripMember, getTripMembers, deleteTripMember, getTripMemberById,
    addTripContribution, getTripContributionsForMember, getTripMemberTotalDirectContribution,
    addTripExpense, updateTripExpense, deleteTripExpense, getTripExpenses,
    getTripMemberNetData, getTripSettlements, triggerTripSettlementCalculation,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export const useTrips = (): TripContextType => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
