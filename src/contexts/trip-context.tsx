
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type {
  Trip, TripMember, TripContribution, TripTransaction, TripSettlement, // Renamed TripExpense
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
  const [tripTransactions, setTripTransactionsState] = useLocalStorage<TripTransaction[]>('trackwise_trip_transactions', []); // Renamed
  
  const [tripFinancialSummaries, setTripFinancialSummaries] = useLocalStorage<Record<string, Record<string, CalculatedMemberFinancials>>>('trackwise_trip_financial_summaries', {});
  const [tripSettlementsMap, setTripSettlementsMap] = useLocalStorage<Record<string, TripSettlement[]>>('trackwise_trip_settlements_map', {});

  const getTripById = useCallback((tripId: string) => trips.find(trip => trip.id === tripId), [trips]);
  const getTrips = useCallback(() => trips, [trips]);
  const getTripMembers = useCallback((tripId: string): TripMember[] => tripMembers.filter(member => member.tripId === tripId), [tripMembers]);
  const getTripMemberById = useCallback((tripMemberId: string) => tripMembers.find(member => member.id === tripMemberId), [tripMembers]);
  const getTripTransactions = useCallback((tripIdToFilter: string): TripTransaction[] => tripTransactions.filter(transaction => transaction.tripId === tripIdToFilter), [tripTransactions]); // Renamed
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

    const transactionsForThisTrip = tripTransactions.filter(te => te.tripId === tripId && te.transactionType === 'expense'); // Only expenses for settlement
    const expenseInputs: ExpenseInput[] = transactionsForThisTrip.map(exp => ({
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
  }, [tripMembers, tripContributions, tripTransactions, setTripFinancialSummaries, setTripSettlementsMap]); // Renamed

  const triggerTripSettlementCalculation = useCallback((tripId: string) => {
    _calculateAndStoreTripSettlements(tripId);
  }, [_calculateAndStoreTripSettlements]);

  useEffect(() => {
    trips.forEach(trip => triggerTripSettlementCalculation(trip.id));
  }, [tripMembers, tripContributions, tripTransactions, trips, triggerTripSettlementCalculation]); // Renamed


  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    setTrips(prev => [...prev, { ...tripData, id: uuidv4(), createdAt: formatISO(new Date()) }]);
  }, [setTrips]);

  const addTripMember = useCallback((tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => {
    setTripMembersState(prev => [...prev, { ...memberData, id: uuidv4(), tripId }]);
  }, [setTripMembersState]);

  const deleteTripMember = useCallback((tripMemberId: string, tripId: string) => {
    setTripMembersState(prev => prev.filter(member => member.id !== tripMemberId));
    setTripContributionsState(prevContributions => prevContributions.filter(contrib => contrib.tripMemberId !== tripMemberId || contrib.tripId !== tripId));
    setTripTransactionsState(prevTransactions => prevTransactions.map(trans => { // Renamed
      if (trans.tripId === tripId) {
        const newSplitWith = trans.splitWithTripMemberIds?.filter(id => id !== tripMemberId);
        return { ...trans, paidByTripMemberId: trans.paidByTripMemberId === tripMemberId ? POT_PAYER_ID : trans.paidByTripMemberId,
                 splitWithTripMemberIds: newSplitWith, isSplit: !!(newSplitWith && newSplitWith.length > 0 && trans.isSplit) };
      }
      return trans;
    }));
  }, [setTripMembersState, setTripContributionsState, setTripTransactionsState]);

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

  const addTripTransaction = useCallback((transactionData: Omit<TripTransaction, 'id'>) => { // Renamed
    setTripTransactionsState(prev => [...prev, { ...transactionData, id: uuidv4() }]);
  }, [setTripTransactionsState]);

  const updateTripTransaction = useCallback((updatedTransaction: TripTransaction) => { // Renamed
    setTripTransactionsState(prev => prev.map(trans => trans.id === updatedTransaction.id ? updatedTransaction : trans));
  }, [setTripTransactionsState]);

  const deleteTripTransaction = useCallback((transactionId: string) => { // Renamed
    setTripTransactionsState(prev => prev.filter(trans => trans.id !== transactionId));
  }, [setTripTransactionsState]);

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
    trips, tripMembers, tripContributions, tripTransactions, // Renamed
    tripFinancialSummaries, tripSettlementsMap,
    addTrip, getTripById, getTrips,
    addTripMember, getTripMembers, deleteTripMember, getTripMemberById,
    addTripContribution, getTripContributionsForMember, getTripMemberTotalDirectContribution,
    addTripTransaction, updateTripTransaction, deleteTripTransaction, getTripTransactions, // Renamed
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

    