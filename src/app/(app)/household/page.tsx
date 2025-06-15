
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, DollarSign, ClipboardList, WalletCards, DivideSquare, TrendingDown, TrendingUp, Banknote, ListChecks, Download, Shuffle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppContext } from '@/contexts/app-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import type { Member, Contribution, Expense, HouseholdSettlement } from '@/lib/types';
import { MemberForm } from '@/components/household/member-form';
import { MemberList } from '@/components/household/member-list';
import { ContributionForm, type ContributionFormValues } from '@/components/household/contribution-form';
import { ExpenseForm, type ExpenseFormValues as ExpenseFormValuesType } from '@/components/expenses/expense-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY, HOUSEHOLD_EXPENSE_CATEGORY_ID, POT_PAYER_ID } from '@/lib/constants';
import Link from 'next/link';
import { cn, exportToCsv } from '@/lib/utils';
import { TripSettlementList } from '@/components/trips/trip-settlement-list';


export default function HouseholdPage() {
  const {
    members, addMember, deleteMember: contextDeleteMember,
    contributions, addContribution, getMemberTotalContribution,
    expenses, addExpense, sharedBudgets, getCategoryById,
    getTotalHouseholdSpending,
    getHouseholdOverallSettlements, triggerHouseholdSettlementCalculation, getHouseholdMemberNetPotData
  } = useAppContext();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<Member | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const householdSettlements = getHouseholdOverallSettlements();

  useEffect(() => {
    triggerHouseholdSettlementCalculation();
  }, [members, contributions, expenses, sharedBudgets, triggerHouseholdSettlementCalculation]);


  const currentUserAsHouseholdMember = useMemo(() => {
    if (!authUser || !members || members.length === 0) return undefined;
    return members.find(m =>
        (authUser.displayName && m.name.toLowerCase() === authUser.displayName.toLowerCase()) ||
        (authUser.email && m.name.toLowerCase() === authUser.email.split('@')[0].toLowerCase())
    );
  }, [authUser, members]);

  const handleSaveMember = useCallback(async (data: Omit<Member, 'id'>) => {
    setIsSubmittingMember(true);
    try {
      addMember(data);
      toast({ title: "Member Added", description: `${data.name} has been added to the household.` });
      setIsMemberFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not add member. Please try again." });
    } finally {
      setIsSubmittingMember(false);
    }
  }, [addMember, toast]);

  const handleDeleteMemberRequest = useCallback((memberId: string) => {
    setMemberToDelete(memberId);
  }, []);

  const confirmDeleteMember = useCallback(() => {
    if (memberToDelete) {
      const member = members.find(m => m.id === memberToDelete);
      contextDeleteMember(memberToDelete);
      toast({ title: "Member Deleted", description: `${member?.name || 'The member'} has been removed from the household.` });
      setMemberToDelete(null);
    }
  }, [memberToDelete, members, contextDeleteMember, toast]);

  const openMemberFormForNew = useCallback(() => {
    setIsMemberFormOpen(true);
  }, []);

  const handleAddContributionClick = useCallback((memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMemberForContribution(member);
      setIsContributionFormOpen(true);
    }
  }, [members]);

  const handleSaveContribution = useCallback(async (data: ContributionFormValues) => {
    if (!selectedMemberForContribution) return;
    setIsSubmittingContribution(true);
    try {
      const contributionData: Omit<Contribution, 'id'> = {
        ...data,
        memberId: selectedMemberForContribution.id,
        date: format(data.date, "yyyy-MM-dd"),
      };
      addContribution(contributionData);
      toast({ title: "Contribution Added", description: `Contribution from ${selectedMemberForContribution.name} recorded.` });
      setIsContributionFormOpen(false);
      setSelectedMemberForContribution(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save contribution. Please try again." });
    } finally {
      setIsSubmittingContribution(false);
    }
  }, [selectedMemberForContribution, addContribution, toast]);

  const handleSaveExpense = useCallback(async (data: ExpenseFormValuesType) => {
    setIsSubmittingExpense(true);
    let expenseData = { ...data, date: format(data.date, "yyyy-MM-dd") };

    if (!expenseData.categoryId && (!expenseData.sharedBudgetId || expenseData.sharedBudgetId === "__NONE__")) {
      expenseData.categoryId = HOUSEHOLD_EXPENSE_CATEGORY_ID;
    }
    if (expenseData.isSplit && !expenseData.paidByMemberId) {
        expenseData.paidByMemberId = POT_PAYER_ID; 
    }

    if (expenseData.sharedBudgetId === "__NONE__") {
      expenseData.sharedBudgetId = undefined;
    }

    try {
      addExpense(expenseData);
      toast({ title: "Shared Expense Added", description: "Your new shared expense has been successfully recorded." });
      setIsExpenseFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save shared expense. Please try again." });
    } finally {
      setIsSubmittingExpense(false);
    }
  }, [addExpense, toast]);

  const totalHouseholdContributions = useMemo(() => {
    return members.reduce((sum, member) => sum + getMemberTotalContribution(member.id), 0);
  }, [members, getMemberTotalContribution, contributions]);

  const totalPotSpending = useMemo(() => {
    return getTotalHouseholdSpending(); 
  }, [getTotalHouseholdSpending, expenses, sharedBudgets]);

  const remainingInPot = totalHouseholdContributions - totalPotSpending;
  const potUsagePercentage = totalHouseholdContributions > 0 ? Math.min((totalPotSpending / totalHouseholdContributions) * 100, 100) : 0;

  const handleExportHouseholdData = useCallback(() => {
    const csvRows: (string | number | undefined)[][] = [];
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const filename = `trackwise_household_data_${currentDate}.csv`;

    csvRows.push([`Trackwise Household Data - ${currentDate}`]);
    csvRows.push([]);

    csvRows.push(["Household Pot Summary"]);
    csvRows.push(["Metric", "Amount"]);
    csvRows.push([`Total Household Contributions (${DEFAULT_CURRENCY})`, totalHouseholdContributions.toFixed(2)]);
    csvRows.push([`Total Shared Household Spending (from Pot) (${DEFAULT_CURRENCY})`, totalPotSpending.toFixed(2)]);
    csvRows.push([`Remaining in Pot (${DEFAULT_CURRENCY})`, remainingInPot.toFixed(2)]);
    csvRows.push([]);

    csvRows.push(["Member Overview (Pot Share)"]);
    csvRows.push(["Member Name", `Total Direct Contributions to Pot (${DEFAULT_CURRENCY})`, `Share of Pot Expenses (${DEFAULT_CURRENCY})`, `Net Share in Pot (${DEFAULT_CURRENCY})`]);
    members.forEach(member => {
      const netData = getHouseholdMemberNetPotData(member.id);
      csvRows.push([member.name, netData.directContributionToPot.toFixed(2), netData.shareOfPotExpenses.toFixed(2), netData.netPotShare.toFixed(2)]);
    });
    csvRows.push([]);

    if (householdSettlements.length > 0) {
        csvRows.push(["Household Pot Settlements (Who Owes Whom for Pot Balance)"]);
        csvRows.push(["Owed By", "Owes To", `Amount (${DEFAULT_CURRENCY})`]);
        householdSettlements.forEach(settlement => {
            const owedByName = members.find(m => m.id === settlement.owedByTripMemberId)?.name || 'Unknown'; 
            const owedToName = members.find(m => m.id === settlement.owedToTripMemberId)?.name || 'Unknown';
            csvRows.push([owedByName, owedToName, settlement.amount.toFixed(2)]);
        });
    } else {
        csvRows.push(["Household Pot Settlements (Who Owes Whom for Pot Balance)"]);
        csvRows.push(["All Square! No settlements needed for the pot."]);
    }
    csvRows.push([]);


    csvRows.push(["Individual Contributions to Pot"]);
    csvRows.push(["Member Name", `Amount (${DEFAULT_CURRENCY})`, "Date", "Notes"]);
    contributions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(contrib => {
      const memberName = members.find(m => m.id === contrib.memberId)?.name || 'Unknown Member';
      csvRows.push([memberName, contrib.amount.toFixed(2), contrib.date, contrib.notes || '']);
    });
    csvRows.push([]);

    csvRows.push(["Expenses Paid From Household Pot"]);
    csvRows.push(["Description", `Amount (${DEFAULT_CURRENCY})`, "Date", "Category/Linked Budget"]);
    const potPaidExpenses = expenses.filter(exp => exp.paidByMemberId === POT_PAYER_ID)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    potPaidExpenses.forEach(exp => {
      let source = "Unknown";
      if (exp.sharedBudgetId) {
        const budget = sharedBudgets.find(sb => sb.id === exp.sharedBudgetId);
        source = budget ? `Shared Budget: ${budget.name}` : `Shared Budget: ID ${exp.sharedBudgetId}`;
      } else if (exp.categoryId) {
        const category = getCategoryById(exp.categoryId);
        source = category ? `Category: ${category.name}` : `Category: ID ${exp.categoryId}`;
      }
      csvRows.push([exp.description, exp.amount.toFixed(2), exp.date, source]);
    });

    exportToCsv(filename, csvRows);
    toast({ title: "Household Data Exported", description: `Data exported to ${filename}` });
  }, [members, contributions, expenses, sharedBudgets, householdSettlements, totalHouseholdContributions, totalPotSpending, remainingInPot, getHouseholdMemberNetPotData, getCategoryById, toast]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members, track contributions, and oversee shared finances."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportHouseholdData} disabled={members.length === 0 && contributions.length === 0 && expenses.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export Household Data
            </Button>
            <Button variant="outline" onClick={() => setIsExpenseFormOpen(true)}>
              <ListChecks className="mr-2 h-4 w-4" /> Add Shared Expense
            </Button>
            <Button onClick={openMemberFormForNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Member
            </Button>
          </div>
        }
      />

      <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Household Member</DialogTitle>
            <DialogDescription>
              Enter the name of the new household member.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            onSave={handleSaveMember}
            onCancel={() => setIsMemberFormOpen(false)}
            isSubmitting={isSubmittingMember}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isContributionFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedMemberForContribution(null);
        setIsContributionFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Contribution for {selectedMemberForContribution?.name}</DialogTitle>
            <DialogDescription>
              Record a new contribution from this household member to the communal pot.
            </DialogDescription>
          </DialogHeader>
          <ContributionForm
            onSave={handleSaveContribution}
            onCancel={() => {
              setIsContributionFormOpen(false);
              setSelectedMemberForContribution(null);
            }}
            isSubmitting={isSubmittingContribution}
            memberName={selectedMemberForContribution?.name}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Shared Expense</DialogTitle>
            <DialogDescription>
              Fill in the details for a new shared household expense. Select "Paid from Pot" if the communal fund is used.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSave={handleSaveExpense}
            onCancel={() => setIsExpenseFormOpen(false)}
            isSubmitting={isSubmittingExpense}
            availableMembersForSplitting={members}
            currentUserIdForDefaultPayer={currentUserAsHouseholdMember?.id}
            hideSplittingFeature={false}
            allowPotPayer={true} 
          />
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member, their contributions, and any associated expense splits from the household. Settlements will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Household Members ({members.length})
              </CardTitle>
              <CardDescription>View members, their contributions to the pot, and their net share of household pot finances.</CardDescription>
            </CardHeader>
            <CardContent>
              <MemberList
                members={members}
                onDeleteMember={handleDeleteMemberRequest}
                onAddContribution={handleAddContributionClick}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-6 w-6 text-primary" />
                Household Pot Settlement
              </CardTitle>
              <CardDescription>Who owes whom to balance the household pot based on contributions and pot-paid expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                <TripSettlementList settlements={householdSettlements} tripId="household_pot_settlement" />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-6 w-6 text-primary" />
                    Household Pot Summary
                </CardTitle>
                <CardDescription>Overview of the collective household funds and their usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-accent"/>Total Pot Contributions:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{totalHouseholdContributions.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-destructive"/>Total Pot Spending:</span>
                    <span className="font-semibold text-destructive">{DEFAULT_CURRENCY}{totalPotSpending.toFixed(2)}</span>
                </div>
                 <hr className="my-1 border-border"/>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Remaining in Pot:</span>
                    <span className={cn("font-bold text-lg", remainingInPot >=0 ? "text-primary" : "text-destructive")}>{DEFAULT_CURRENCY}{remainingInPot.toFixed(2)}</span>
                </div>
                {totalHouseholdContributions > 0 && (
                    <div>
                        <Progress value={potUsagePercentage} className="h-2 mt-1" aria-label={`Pot usage ${potUsagePercentage.toFixed(0)}%`}/>
                        <p className="text-xs text-muted-foreground mt-1 text-right">{potUsagePercentage.toFixed(0)}% of pot used.</p>
                    </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">Pot spending includes expenses explicitly paid from the pot.</p>
            </CardContent>
           </Card>

           <Card>
            <CardHeader>
              <CardTitle  className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                Shared Shopping List
              </CardTitle>
              <CardDescription>Manage items your household needs to buy together.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Keep track of groceries and other shared items the household plans to purchase.</p>
            </CardContent>
            <CardFooter>
              <Link href="/household/shopping-list" className="w-full">
                <Button className="w-full">
                  <ClipboardList className="mr-2 h-4 w-4" /> View Shopping List
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <WalletCards className="h-6 w-6 text-primary" />
                    Shared Budgets
                </CardTitle>
                 <CardDescription>Create and manage budgets for shared household expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Define spending targets for categories like groceries or utilities. Expenses linked here and paid from the pot affect pot calculations.</p>
            </CardContent>
            <CardFooter>
               <Link href="/household/shared-budgets" className="w-full">
                <Button className="w-full">
                  <WalletCards className="mr-2 h-4 w-4" /> Manage Shared Budgets
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DivideSquare className="h-6 w-6 text-primary" />
                    Expense Splitting & Debts
                </CardTitle>
                <CardDescription>Track individual expenses paid by members and split among others. These are separate from the household pot.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">For costs not paid from the communal pot but shared among members, use this to manage personal reimbursements.</p>
            </CardContent>
             <CardFooter>
               <Link href="/household/expense-splitting" className="w-full">
                <Button className="w-full">
                  <DivideSquare className="mr-2 h-4 w-4" /> Manage Splits & Debts
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
