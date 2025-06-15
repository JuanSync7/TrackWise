
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
import { DEFAULT_CURRENCY } from '@/lib/constants';
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
    tripMembers: globalTripMembers, 
    tripContributions: globalTripContributions, 
    addTripExpense, getTripExpenses,
    tripExpenses: globalTripExpenses, 
    getTripMembers,
    getTripSettlements, triggerTripSettlementCalculation
  } = useAppContext();
  const { user: authUser } = useAuth(); 
  const { toast } = useToast();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [currentTripMembers, setCurrentTripMembers] = useState<TripMember[]>([]);
  const [currentTripExpenses, setCurrentTripExpensesList] = useState<TripExpense[]>([]);
  const [settlements, setSettlements] = useState<TripSettlement[]>([]);

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedTripMemberForContribution, setSelectedTripMemberForContribution] = useState<TripMember | null>(null);

  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [tripMemberToDelete, setTripMemberToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      const foundTrip = getTripById(tripId);
      if (foundTrip) {
        setTrip(foundTrip);
        setCurrentTripMembers(getTripMembers(tripId));
        setCurrentTripExpensesList(getTripExpenses(tripId));
        triggerTripSettlementCalculation(tripId); 
        setSettlements(getTripSettlements(tripId));
      } else {
        toast({ variant: "destructive", title: "Trip Not Found", description: "The requested trip could not be found." });
        router.push('/trips');
      }
    }
  }, [tripId, getTripById, getTripMembers, getTripExpenses, router, toast, triggerTripSettlementCalculation, getTripSettlements]);
  
  useEffect(() => {
    if (tripId) {
        setCurrentTripMembers(getTripMembers(tripId));
        setCurrentTripExpensesList(getTripExpenses(tripId));
        setSettlements(getTripSettlements(tripId)); // Also update settlements if global state changes
    }
  }, [tripId, globalTripMembers, globalTripContributions, globalTripExpenses, getTripMembers, getTripExpenses, getTripSettlements]);


  const currentAuthUserAsTripMember = useMemo(() => {
    if (!authUser || !currentTripMembers || currentTripMembers.length === 0) return undefined;
    return currentTripMembers.find(tm => 
        (authUser.displayName && tm.name.toLowerCase() === authUser.displayName.toLowerCase()) ||
        (authUser.email && tm.name.toLowerCase() === authUser.email.split('@')[0].toLowerCase())
    );
  }, [authUser, currentTripMembers]);


  const handleSaveTripMember = async (data: TripMemberFormValues) => {
    if (!tripId) return;
    setIsSubmittingMember(true);
    try {
      addTripMember(tripId, data); // This will also trigger settlement calc in context
      toast({ title: "Trip Member Added", description: `${data.name} has been added to the trip.` });
      setIsMemberFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add trip member." });
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleDeleteTripMember = (memberId: string) => {
    setTripMemberToDelete(memberId);
  };

  const confirmDeleteTripMember = () => {
    if (tripMemberToDelete && tripId) {
      const member = getTripMemberById(tripMemberToDelete);
      contextDeleteTripMember(tripMemberToDelete, tripId); // This will also trigger settlement calc
      toast({ title: "Trip Member Deleted", description: `${member?.name || 'The member'} has been removed from the trip.` });
      setTripMemberToDelete(null);
    }
  };

  const handleAddTripContributionClick = (memberId: string) => {
    const member = getTripMemberById(memberId);
    if (member) {
      setSelectedTripMemberForContribution(member);
      setIsContributionFormOpen(true);
    }
  };

  const handleSaveTripContribution = async (data: TripContributionFormValues) => {
    if (!selectedTripMemberForContribution || !tripId) return;
    setIsSubmittingContribution(true);
    try {
      addTripContribution(tripId, selectedTripMemberForContribution.id, data); // This will also trigger settlement calc
      toast({ title: "Trip Contribution Added", description: `Contribution from ${selectedTripMemberForContribution.name} recorded.` });
      setIsContributionFormOpen(false);
      setSelectedTripMemberForContribution(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip contribution." });
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const handleSaveTripExpense = async (formData: GenericExpenseFormValues) => {
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
      addTripExpense(tripExpenseData); // This will also trigger settlement calc
      toast({ title: "Trip Expense Added", description: `Expense "${formData.description}" recorded for the trip.` });
      setIsExpenseFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save trip expense." });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const totalTripContributions = useMemo(() => {
    return currentTripMembers.reduce((sum, member) => sum + getTripMemberTotalDirectContribution(member.id, tripId), 0);
  }, [currentTripMembers, getTripMemberTotalDirectContribution, tripId, globalTripContributions]); 

  const totalTripSpending = useMemo(() => {
    return currentTripExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [currentTripExpenses]);

  const remainingTripPot = totalTripContributions - totalTripSpending;
  const tripPotUsagePercentage = totalTripContributions > 0 ? Math.min((totalTripSpending / totalTripContributions) * 100, 100) : 0;


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
            <DialogDescription>Record a new contribution from this trip member.</DialogDescription>
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
              Fill in the details for a new expense for this trip. This will affect the trip pot and settlements.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSave={handleSaveTripExpense}
            onCancel={() => setIsExpenseFormOpen(false)}
            isSubmitting={isSubmittingExpense}
            hideSharedBudgetLink={true} 
            hideSplittingFeature={false}
            availableMembersForSplitting={currentTripMembers}
            currentUserIdForDefaultPayer={currentAuthUserAsTripMember?.id}
          />
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!tripMemberToDelete} onOpenChange={() => setTripMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member, their contributions, and adjust expense splits from this trip. This action cannot be undone.
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
                Trip Members ({currentTripMembers.length})
              </CardTitle>
              <CardDescription>Manage trip members, their contributions, and their net financial position within the trip.</CardDescription>
            </CardHeader>
            <CardContent>
              <TripMemberList
                tripMembers={currentTripMembers}
                onDeleteTripMember={handleDeleteTripMember}
                onAddTripContribution={handleAddTripContributionClick}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-6 w-6 text-primary" />
                Trip Settlement
              </CardTitle>
              <CardDescription>Who owes whom to balance the trip's finances. This updates as contributions and expenses are logged.</CardDescription>
            </CardHeader>
            <CardContent>
                <TripSettlementList settlements={settlements} tripId={tripId} />
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
                <CardDescription>Overall financial status of the trip pot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Contributions:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{totalTripContributions.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Trip Spending:</span>
                    <span className="font-semibold text-destructive">{DEFAULT_CURRENCY}{totalTripSpending.toFixed(2)}</span>
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
                 <p className="text-xs text-muted-foreground pt-1">This is the collective balance of the trip's funds.</p>
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
