
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Banknote, ListChecks, ArrowLeft, HandCoins, CircleDollarSign, Shuffle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/contexts/app-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import type { Trip, TripMember, TripContribution, TripExpense, TripSettlement } from '@/lib/types';
import { TripMemberForm, type TripMemberFormValues } from '@/components/trips/trip-member-form';
import { TripMemberList } from '@/components/trips/trip-member-list';
import { TripContributionForm, type TripContributionFormValues } from '@/components/trips/trip-contribution-form';
import { ExpenseForm, type ExpenseFormValues as GenericExpenseFormValues } from '@/components/expenses/expense-form';
import { TripSettlementList } from '@/components/trips/trip-settlement-list';
import { DEFAULT_CURRENCY, POT_PAYER_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format as formatDate } from 'date-fns';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const {
    getTripById,
    addTripMember, deleteTripMember: contextDeleteTripMember, getTripMemberById,
    addTripContribution, getTripMemberTotalDirectContribution,
    tripMembers: globalTripMembers, // Raw global state for dependency
    tripContributions: globalTripContributions, // Raw global state for dependency
    addTripExpense,
    tripExpenses: globalTripExpenses, // Raw global state for dependency
    getTripMembers, // Context getter function
    getTripExpenses, // Context getter function
    getTripSettlements, // Context getter function
    triggerTripSettlementCalculation,
  } = useAppContext();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedTripMemberForContribution, setSelectedTripMemberForContribution] = useState<TripMember | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [tripMemberToDelete, setTripMemberToDelete] = useState<string | null>(null);

  // Derive lists directly from context using useMemo
  const memoizedTripMembers = useMemo(() => {
    return tripId ? getTripMembers(tripId) : [];
  }, [tripId, getTripMembers]);

  const memoizedTripExpensesList = useMemo(() => {
    return tripId ? getTripExpenses(tripId) : [];
  }, [tripId, getTripExpenses]);

  const memoizedSettlements = useMemo(() => {
    return tripId ? getTripSettlements(tripId) : [];
  }, [tripId, getTripSettlements]);

  // Effect for initial trip loading
  useEffect(() => {
    if (tripId) {
      const foundTrip = getTripById(tripId);
      if (foundTrip) {
        setTrip(foundTrip);
        // Initial settlement calculation happens after global data dependencies trigger the other useEffect
      } else {
        toast({ variant: "destructive", title: "Trip Not Found", description: "The requested trip could not be found." });
        router.push('/trips');
      }
    }
  }, [tripId, getTripById, router, toast]);

  // Effect to re-calculate settlements when relevant global data changes or tripId changes
  useEffect(() => {
    if (tripId) {
      triggerTripSettlementCalculation(tripId);
    }
  }, [tripId, globalTripMembers, globalTripContributions, globalTripExpenses, triggerTripSettlementCalculation]);


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
    const member = getTripMemberById(memberId); // getTripMemberById should be stable
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

  const handleSaveTripExpense = useCallback(async (formData: GenericExpenseFormValues) => {
    if (!tripId) return;
    setIsSubmittingExpense(true);
    try {
      const tripExpenseData: Omit<TripExpense, 'id'> = {
        tripId: tripId,
        description: formData.description,
        amount: formData.amount,
        date: formatDate(formData.date, "yyyy-MM-dd"),
        categoryId: formData.categoryId,
        notes: formData.notes,
        isSplit: formData.isSplit,
        paidByTripMemberId: formData.paidByMemberId, 
        splitWithTripMemberIds: formData.splitWithMemberIds,
      };
      addTripExpense(tripExpenseData);
      toast({ title: "Trip Expense Added", description: `Expense "${formData.description}" recorded for the trip.` });
      setIsExpenseFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip expense." });
    } finally {
      setIsSubmittingExpense(false);
    }
  }, [tripId, addTripExpense, toast]);

  const totalTripContributions = useMemo(() => {
    return memoizedTripMembers.reduce((sum, member) => sum + getTripMemberTotalDirectContribution(member.id, tripId), 0);
  }, [memoizedTripMembers, getTripMemberTotalDirectContribution, tripId]);

  const totalTripPotSpending = useMemo(() => {
    return memoizedTripExpensesList
      .filter(exp => exp.paidByTripMemberId === POT_PAYER_ID)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [memoizedTripExpensesList]);

  const remainingTripPot = totalTripContributions - totalTripPotSpending;
  const tripPotUsagePercentage = totalTripContributions > 0 ? Math.min((totalTripPotSpending / totalTripContributions) * 100, 100) : 0;


  if (!trip) {
    return (
      <div className="container mx-auto flex justify-center items-center h-full">
        <p>Loading trip details or trip not found...</p>
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
            <Button variant="outline" onClick={() => setIsExpenseFormOpen(true)}>
              <ListChecks className="mr-2 h-4 w-4" /> Add Trip Expense
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
          <TripMemberForm
            onSave={handleSaveTripMember}
            onCancel={() => setIsMemberFormOpen(false)}
            isSubmitting={isSubmittingMember}
          />
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
          <TripContributionForm
            onSave={handleSaveTripContribution}
            onCancel={() => {
              setIsContributionFormOpen(false);
              setSelectedTripMemberForContribution(null);
            }}
            isSubmitting={isSubmittingContribution}
            tripMemberName={selectedTripMemberForContribution?.name}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Trip Expense</DialogTitle>
            <DialogDescription>
              Fill in details for a new trip expense. Select "Paid from Pot" if communal funds were used.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSave={handleSaveTripExpense}
            onCancel={() => setIsExpenseFormOpen(false)}
            isSubmitting={isSubmittingExpense}
            hideSharedBudgetLink={true}
            hideSplittingFeature={false}
            availableMembersForSplitting={memoizedTripMembers}
            currentUserIdForDefaultPayer={currentAuthUserAsTripMember?.id}
            allowPotPayer={true} 
          />
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!tripMemberToDelete} onOpenChange={() => setTripMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member, their contributions, and adjust expense splits from this trip. This action cannot be undone. Settlements will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTripMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
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
              <CardDescription>Manage trip members, their contributions to the trip pot, and their net financial position within the trip pot.</CardDescription>
            </CardHeader>
            <CardContent>
              <TripMemberList
                tripMembers={memoizedTripMembers}
                onDeleteTripMember={handleDeleteTripMemberRequest}
                onAddTripContribution={handleAddTripContributionClick}
                numberOfTripMembers={memoizedTripMembers.length} 
              />
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
                <TripSettlementList settlements={memoizedSettlements} tripId={tripId} />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CircleDollarSign className="h-6 w-6 text-primary" />
                    Trip Pot Summary
                </CardTitle>
                <CardDescription>Overall financial status of the communal trip pot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Pot Contributions:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{totalTripContributions.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Pot Spending:</span>
                    <span className="font-semibold text-destructive">{DEFAULT_CURRENCY}{totalTripPotSpending.toFixed(2)}</span>
                </div>
                 <hr className="my-1 border-border"/>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Remaining in Trip Pot:</span>
                    <span className={cn("font-bold text-lg", remainingTripPot >=0 ? "text-primary" : "text-destructive")}>{DEFAULT_CURRENCY}{remainingTripPot.toFixed(2)}</span>
                </div>
                {totalTripContributions > 0 && (
                    <div>
                        <Progress value={tripPotUsagePercentage} className="h-2 mt-1" aria-label={`Trip pot usage ${tripPotUsagePercentage.toFixed(0)}%`}/>
                        <p className="text-xs text-muted-foreground mt-1 text-right">{tripPotUsagePercentage.toFixed(0)}% of pot used.</p>
                    </div>
                )}
                 <p className="text-xs text-muted-foreground pt-1">This is the collective balance of the trip's funds. Only expenses explicitly paid from the pot are deducted here.</p>
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
