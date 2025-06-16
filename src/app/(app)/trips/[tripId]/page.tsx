
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Banknote, ListChecks, ArrowLeft, Shuffle, Wallet, Receipt, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTrips } from '@/contexts/trip-context';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import type { Trip, TripMember, TripContribution, TripTransaction, TripSettlement, CalculatedMemberFinancials, MemberDisplayFinancials } from '@/lib/types';
import { DEFAULT_CURRENCY, POT_PAYER_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format as formatDate } from 'date-fns';

const TripMemberForm = React.lazy(() => import('@/components/trips/trip-member-form').then(module => ({ default: module.TripMemberForm })));
type TripMemberFormValues = import('@/components/trips/trip-member-form').TripMemberFormValues;
const TripContributionForm = React.lazy(() => import('@/components/trips/trip-contribution-form').then(module => ({ default: module.TripContributionForm })));
type TripContributionFormValues = import('@/components/trips/trip-contribution-form').TripContributionFormValues;
const TransactionForm = React.lazy(() => import('@/components/transactions/transaction-form').then(module => ({ default: module.TransactionForm })));
type GenericTransactionFormValues = import('@/components/transactions/transaction-form').TransactionFormValues;
const TripMemberList = React.lazy(() => import('@/components/trips/trip-member-list').then(module => ({ default: module.TripMemberList })));
const TripSettlementList = React.lazy(() => import('@/components/trips/trip-settlement-list').then(module => ({ default: module.TripSettlementList })));


export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const {
    getTripById,
    addTripMember, deleteTripMember: contextDeleteTripMember, getTripMemberById,
    addTripContribution,
    tripMembers: globalTripMembers,
    tripContributions: globalTripContributions,
    addTripTransaction,
    tripTransactions: globalTripTransactions,
    getTripMembers,
    getTripTransactions,
    getTripSettlements,
    triggerTripSettlementCalculation,
    tripFinancialSummaries,
    getTripMemberNetData,
  } = useTrips();
  const { getCategoryById } = usePersonalFinance();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [selectedTripMemberForContribution, setSelectedTripMemberForContribution] = useState<TripMember | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [tripMemberToDelete, setTripMemberToDelete] = useState<string | null>(null);

  const memoizedTripMembers = useMemo(() => {
    return tripId ? getTripMembers(tripId) : [];
  }, [tripId, getTripMembers]);

  const rawSettlements = useMemo(() => {
    return tripId ? getTripSettlements(tripId) : [];
  }, [tripId, getTripSettlements]);

  const validSettlements = useMemo(() => {
    const memberIds = new Set(memoizedTripMembers.map(m => m.id));
    return rawSettlements.filter(
      s => memberIds.has(s.owedByTripMemberId) && memberIds.has(s.owedToTripMemberId)
    );
  }, [rawSettlements, memoizedTripMembers]);

  const currentTripFinancials = useMemo(() => {
    return tripFinancialSummaries[tripId] || {};
  }, [tripFinancialSummaries, tripId]);


  useEffect(() => {
    if (tripId) {
      const foundTrip = getTripById(tripId);
      if (foundTrip) {
        setTrip(foundTrip);
      } else {
        toast({ variant: "destructive", title: "Trip Not Found", description: "The requested trip could not be found." });
        router.push('/trips');
      }
    }
  }, [tripId, getTripById, router, toast]);

  useEffect(() => {
    if (tripId) {
      triggerTripSettlementCalculation(tripId);
    }
  }, [tripId, globalTripMembers, globalTripContributions, globalTripTransactions, triggerTripSettlementCalculation]);


  const currentAuthUserAsTripMember = useMemo(() => {
    if (!authUser || !memoizedTripMembers || memoizedTripMembers.length === 0) return undefined;
    return memoizedTripMembers.find(tm =>
        (authUser.displayName && tm.name.toLowerCase() === authUser.displayName.toLowerCase()) ||
        (authUser.email && tm.name.toLowerCase() === authUser.email.split('@')[0].toLowerCase())
    );
  }, [authUser, memoizedTripMembers]);


  const handleSaveTripMember = useCallback(async (data: TripMemberFormValues) => {
    if (!tripId) return;
    setIsSubmittingMember(true);
    try {
      addTripMember(tripId, data);
      toast({ title: "Trip Member Added", description: `${data.name} has been added to the trip.` });
      setIsMemberFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add trip member." });
    } finally {
      setIsSubmittingMember(false);
    }
  }, [tripId, addTripMember, toast]);

  const handleDeleteTripMemberRequest = useCallback((memberId: string) => {
    setTripMemberToDelete(memberId);
  }, []);

  const confirmDeleteTripMember = useCallback(() => {
    if (tripMemberToDelete && tripId) {
      const member = getTripMemberById(tripMemberToDelete);
      contextDeleteTripMember(tripMemberToDelete, tripId);
      toast({ title: "Trip Member Deleted", description: `${member?.name || 'The member'} has been removed from the trip.` });
      setTripMemberToDelete(null);
    }
  }, [tripMemberToDelete, tripId, contextDeleteTripMember, getTripMemberById, toast]);

  const handleAddTripContributionClick = useCallback((memberId: string) => {
    const member = getTripMemberById(memberId);
    if (member) {
      setSelectedTripMemberForContribution(member);
      setIsContributionFormOpen(true);
    }
  }, [getTripMemberById]);

  const handleSaveTripContribution = useCallback(async (data: TripContributionFormValues) => {
    if (!selectedTripMemberForContribution || !tripId) return;
    setIsSubmittingContribution(true);
    try {
      addTripContribution(tripId, selectedTripMemberForContribution.id, data);
      toast({ title: "Trip Contribution Added", description: `Contribution from ${selectedTripMemberForContribution.name} recorded.` });
      setIsContributionFormOpen(false);
      setSelectedTripMemberForContribution(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip contribution." });
    } finally {
      setIsSubmittingContribution(false);
    }
  }, [selectedTripMemberForContribution, tripId, addTripContribution, toast]);

  const handleSaveTripTransaction = useCallback(async (formData: GenericTransactionFormValues) => {
    if (!tripId) return;
    setIsSubmittingTransaction(true);
    try {
      const tripTransactionData: Omit<TripTransaction, 'id' | 'tripId'> & { tripId: string } = {
        tripId: tripId,
        description: formData.description,
        amount: formData.amount,
        date: formatDate(formData.date, "yyyy-MM-dd"),
        categoryId: formData.categoryId,
        notes: formData.notes,
        transactionType: formData.transactionType,
        isSplit: formData.transactionType === 'expense' ? formData.isSplit : false,
        paidByTripMemberId: formData.transactionType === 'expense' ? formData.paidByMemberId : undefined,
        splitWithTripMemberIds: formData.transactionType === 'expense' ? formData.splitWithTripMemberIds : [],
        splitType: formData.transactionType === 'expense' && formData.isSplit ? formData.splitType : undefined,
        customSplitAmounts: formData.transactionType === 'expense' && formData.isSplit && formData.splitType === 'custom' ? formData.customSplitAmounts : [],
      };
      addTripTransaction(tripTransactionData);
      toast({ title: "Trip Transaction Added", description: `Transaction "${formData.description}" recorded for the trip.` });
      setIsTransactionFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip transaction." });
    } finally {
      setIsSubmittingTransaction(false);
    }
  }, [tripId, addTripTransaction, toast]);

 const tripFinancialSummary = useMemo(() => {
    let totalCashInPot = 0;
    let totalMemberPaidExpenses = 0;

    Object.values(currentTripFinancials).forEach(financials => {
      totalCashInPot += financials.directCashContribution;
      totalMemberPaidExpenses += financials.amountPersonallyPaidForGroup;
    });

    const expenseTransactionsForThisTrip = globalTripTransactions.filter(trans => trans.tripId === tripId && trans.transactionType === 'expense');
    const totalPotPaidExpenses = expenseTransactionsForThisTrip
      .filter(exp => exp.paidByTripMemberId === POT_PAYER_ID)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const remainingCashInPot = totalCashInPot - totalPotPaidExpenses;
    const potUsagePercentage = totalCashInPot > 0 ? Math.min((totalPotPaidExpenses / totalCashInPot) * 100, 100) : 0;

    return {
      totalCashInPot,
      totalMemberPaidExpenses,
      totalPotPaidExpenses,
      remainingCashInPot,
      potUsagePercentage,
    };
  }, [currentTripFinancials, globalTripTransactions, tripId]);


  if (!trip) {
    return (
      <div className="container mx-auto flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading trip details...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader
        title={trip.name}
        description={trip.description || "Manage your trip's finances and members."}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsTransactionFormOpen(true)}>
              <ListChecks className="mr-2 h-4 w-4" /> Add Trip Transaction
            </Button>
            <Button variant="outline" onClick={() => setIsMemberFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Trip Member
            </Button>
             <Link href="/trips" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Trips
              </Button>
            </Link>
          </div>
        }
      />

      <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Trip Member</DialogTitle>
            <DialogDescription>Enter the name of the new member for this trip.</DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TripMemberForm
              onSave={handleSaveTripMember}
              onCancel={() => setIsMemberFormOpen(false)}
              isSubmitting={isSubmittingMember}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={isContributionFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedTripMemberForContribution(null);
        setIsContributionFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Contribution for {selectedTripMemberForContribution?.name}</DialogTitle>
            <DialogDescription>Record a new cash contribution from this trip member to the communal trip pot.</DialogDescription>
          </DialogHeader>
           <Suspense fallback={<div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TripContributionForm
              onSave={handleSaveTripContribution}
              onCancel={() => {
                setIsContributionFormOpen(false);
                setSelectedTripMemberForContribution(null);
              }}
              isSubmitting={isSubmittingContribution}
              tripMemberName={selectedTripMemberForContribution?.name}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Trip Transaction</DialogTitle>
            <DialogDescription>
              Fill in details for a new trip transaction. Select "Paid from Pot" if communal funds were used for an expense.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TransactionForm
              onSave={handleSaveTripTransaction}
              onCancel={() => setIsTransactionFormOpen(false)}
              isSubmitting={isSubmittingTransaction}
              showSharedBudgetLink={false}
              showSplittingFeature={true}
              availableMembersForSplitting={memoizedTripMembers}
              currentUserIdForDefaultPayer={currentAuthUserAsTripMember?.id}
              allowPotPayer={true}
            />
          </Suspense>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!tripMemberToDelete} onOpenChange={() => setTripMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member, their contributions, and adjust transaction splits from this trip. This action cannot be undone. Settlements will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTripMember} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4"/>Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Trip Members ({memoizedTripMembers.length})
              </CardTitle>
              <CardDescription>Manage trip members, their cash contributions, personal payments for the group, share of all expenses, and overall net position.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <TripMemberList
                  tripMembers={memoizedTripMembers}
                  onDeleteTripMember={handleDeleteTripMemberRequest}
                  onAddTripContribution={handleAddTripContributionClick}
                />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-6 w-6 text-primary" />
                Trip Settlement
              </CardTitle>
              <CardDescription>Who owes whom to balance all trip finances (contributions, pot expenses, and member-paid shared expenses).</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                  <TripSettlementList
                      settlements={validSettlements}
                      tripId={tripId}
                      finalMemberFinancials={currentTripFinancials}
                      remainingCashInPot={tripFinancialSummary.remainingCashInPot}
                  />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    Trip Pot Cash Summary
                </CardTitle>
                <CardDescription>Cash flow of the communal trip pot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Cash in Pot:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{tripFinancialSummary.totalCashInPot.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Member-Paid (Group Expenses):</span>
                    <span className="font-semibold">{DEFAULT_CURRENCY}{tripFinancialSummary.totalMemberPaidExpenses.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Spent from Pot (Expenses):</span>
                    <span className="font-semibold text-destructive">{DEFAULT_CURRENCY}{tripFinancialSummary.totalPotPaidExpenses.toFixed(2)}</span>
                </div>
                 <hr className="my-1 border-border"/>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Remaining Cash in Pot:</span>
                    <span className={cn("font-bold text-lg", tripFinancialSummary.remainingCashInPot >=0 ? "text-primary" : "text-destructive")}>{DEFAULT_CURRENCY}{tripFinancialSummary.remainingCashInPot.toFixed(2)}</span>
                </div>
                {tripFinancialSummary.totalCashInPot > 0 && (
                    <div>
                        <Progress value={tripFinancialSummary.potUsagePercentage} className="h-2 mt-1" aria-label={`Trip pot usage ${tripFinancialSummary.potUsagePercentage.toFixed(0)}%`}/>
                        <p className="text-xs text-muted-foreground mt-1 text-right">{tripFinancialSummary.potUsagePercentage.toFixed(0)}% of cash pot used.</p>
                    </div>
                )}
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
