
"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, DollarSign, WalletCards, DivideSquare, ListChecks, Download, Shuffle, Wallet, Receipt, Loader2 } from 'lucide-react';
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
import { useHousehold } from '@/contexts/household-context';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import type { Member, Contribution, HouseholdTransaction, HouseholdSettlement, MemberDisplayFinancials, TransactionType } from '@/lib/types'; // Renamed HouseholdExpense
import { MemberList } from '@/components/household/member-list';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY, HOUSEHOLD_EXPENSE_CATEGORY_ID, POT_PAYER_ID } from '@/lib/constants';
import Link from 'next/link';
import { cn, exportToCsv } from '@/lib/utils';
import { TripSettlementList } from '@/components/trips/trip-settlement-list';

const MemberForm = React.lazy(() => import('@/components/household/member-form').then(module => ({ default: module.MemberForm })));
const ContributionForm = React.lazy(() => import('@/components/household/contribution-form').then(module => ({ default: module.ContributionForm })));
type ContributionFormValues = import('@/components/household/contribution-form').ContributionFormValues;
const TransactionForm = React.lazy(() => import('@/components/transactions/transaction-form').then(module => ({ default: module.TransactionForm }))); // Renamed ExpenseForm
type TransactionFormValuesType = import('@/components/transactions/transaction-form').TransactionFormValues; // Renamed


export default function HouseholdPage() {
  const {
    members, addMember, deleteMember: contextDeleteMember, getMemberById,
    contributions, addContribution,
    householdTransactions, addHouseholdTransaction, sharedBudgets, // Renamed
    householdFinancialSummaries, householdOverallSettlements,
    getHouseholdMemberNetData, triggerHouseholdSettlementCalculation,
  } = useHousehold();
  const { getCategoryById } = usePersonalFinance();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false); // This form is now TransactionForm
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<Member | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false); // Renamed
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);


  useEffect(() => {
    triggerHouseholdSettlementCalculation();
  }, [members, contributions, householdTransactions, triggerHouseholdSettlementCalculation]); // Renamed


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

  const handleSaveHouseholdTransaction = useCallback(async (data: TransactionFormValuesType) => { // Renamed
    setIsSubmittingTransaction(true); // Renamed
    let transactionData: Omit<HouseholdTransaction, 'id'> = { // Renamed
      description: data.description,
      amount: data.amount,
      date: format(data.date, "yyyy-MM-dd"),
      categoryId: data.categoryId,
      notes: data.notes,
      transactionType: data.transactionType, // Added
      sharedBudgetId: data.sharedBudgetId === NONE_SHARED_BUDGET_VALUE ? undefined : data.sharedBudgetId,
      isSplit: data.transactionType === 'expense' ? data.isSplit : false,
      paidByMemberId: data.transactionType === 'expense' ? data.paidByMemberId : undefined,
      splitWithMemberIds: data.transactionType === 'expense' ? data.splitWithMemberIds : [],
    };

    // Default category for household transactions if not linked to shared budget and no category selected
    if (transactionData.transactionType === 'expense' && !transactionData.categoryId && !transactionData.sharedBudgetId) {
      transactionData.categoryId = HOUSEHOLD_EXPENSE_CATEGORY_ID;
    }
    // Default payer to POT if split and no payer selected (for expenses)
    if (transactionData.transactionType === 'expense' && transactionData.isSplit && !transactionData.paidByMemberId) {
        transactionData.paidByMemberId = POT_PAYER_ID;
    }

    try {
      addHouseholdTransaction(transactionData); // Renamed
      toast({ title: "Shared Transaction Added", description: "Your new shared transaction has been successfully recorded." }); // Updated
      setIsExpenseFormOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save shared transaction. Please try again." });
    } finally {
      setIsSubmittingTransaction(false); // Renamed
    }
  }, [addHouseholdTransaction, toast]); // Renamed


  const householdFinancialSummary = useMemo(() => {
    let totalCashInPot = 0;
    let totalMemberPaidExpenses = 0; // Only expenses
    Object.values(householdFinancialSummaries).forEach(financials => {
      totalCashInPot += financials.directCashContribution;
      totalMemberPaidExpenses += financials.amountPersonallyPaidForGroup;
    });

    const totalPotPaidExpenses = householdTransactions // Renamed
      .filter(trans => trans.transactionType === 'expense' && trans.paidByMemberId === POT_PAYER_ID)
      .reduce((sum, trans) => sum + trans.amount, 0);

    const remainingCashInPot = totalCashInPot - totalPotPaidExpenses;
    const potUsagePercentage = totalCashInPot > 0 ? Math.min((totalPotPaidExpenses / totalCashInPot) * 100, 100) : 0;

    return {
      totalCashInPot,
      totalMemberPaidExpenses,
      totalPotPaidExpenses,
      remainingCashInPot,
      potUsagePercentage,
    };
  }, [householdFinancialSummaries, householdTransactions]); // Renamed


  const handleExportHouseholdData = useCallback(() => {
    const csvRows: (string | number | undefined)[][] = [];
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const filename = `trackwise_household_data_${currentDate}.csv`;

    csvRows.push([`Trackwise Household Data - ${currentDate}`]);
    csvRows.push([]);
    csvRows.push(["Household Pot Cash Summary"]);
    csvRows.push(["Metric", "Amount"]);
    csvRows.push([`Total Cash Contributions to Pot (${DEFAULT_CURRENCY})`, householdFinancialSummary.totalCashInPot.toFixed(2)]);
    csvRows.push([`Total Expenses Paid Directly from Pot (${DEFAULT_CURRENCY})`, householdFinancialSummary.totalPotPaidExpenses.toFixed(2)]);
    csvRows.push([`Remaining Cash in Pot (${DEFAULT_CURRENCY})`, householdFinancialSummary.remainingCashInPot.toFixed(2)]);
    csvRows.push([`Total Expenses Paid by Members (Personal Funds for Group) (${DEFAULT_CURRENCY})`, householdFinancialSummary.totalMemberPaidExpenses.toFixed(2)]);
    csvRows.push([]);
    csvRows.push(["Member Overview (Overall Position)"]);
    csvRows.push(["Member Name", `Cash to Pot (${DEFAULT_CURRENCY})`, `Paid for Group (Personal) (${DEFAULT_CURRENCY})`, `Share of All Expenses (${DEFAULT_CURRENCY})`, `Net Position (${DEFAULT_CURRENCY})`]);
    members.forEach(member => {
      const netData = getHouseholdMemberNetData(member.id);
      csvRows.push([
          member.name,
          netData.directCashContribution.toFixed(2),
          netData.amountPersonallyPaidForGroup.toFixed(2),
          netData.totalShareOfAllGroupExpenses.toFixed(2),
          netData.netOverallPosition.toFixed(2)
        ]);
    });
    csvRows.push([]);

    if (householdOverallSettlements.length > 0) {
        csvRows.push(["Household Overall Settlements (Who Owes Whom)"]);
        csvRows.push(["Owed By", "Owes To", `Amount (${DEFAULT_CURRENCY})`]);
        householdOverallSettlements.forEach(settlement => {
            const owedByName = members.find(m => m.id === settlement.owedByTripMemberId)?.name || 'Unknown';
            const owedToName = members.find(m => m.id === settlement.owedToTripMemberId)?.name || 'Unknown';
            csvRows.push([owedByName, owedToName, settlement.amount.toFixed(2)]);
        });
    } else {
        csvRows.push(["Household Overall Settlements (Who Owes Whom)"]);
        csvRows.push(["All Square! No settlements needed."]);
    }
    csvRows.push([]);
    csvRows.push(["Individual Cash Contributions to Pot"]);
    csvRows.push(["Member Name", `Amount (${DEFAULT_CURRENCY})`, "Date", "Notes"]);
    contributions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(contrib => {
      const memberName = members.find(m => m.id === contrib.memberId)?.name || 'Unknown Member';
      csvRows.push([memberName, contrib.amount.toFixed(2), contrib.date, contrib.notes || '']);
    });
    csvRows.push([]);
    csvRows.push(["Household Transactions (All Payers)"]);
    csvRows.push(["Description", `Amount (${DEFAULT_CURRENCY})`, "Date", "Type", "Category/Linked Budget", "Paid By"]); // Added Type
    householdTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Renamed
    .forEach(trans => { // Renamed
      let source = "Unknown";
      if (trans.sharedBudgetId) {
        const budget = sharedBudgets.find(sb => sb.id === trans.sharedBudgetId);
        source = budget ? `Shared Budget: ${budget.name}` : `Shared Budget: ID ${trans.sharedBudgetId}`;
      } else if (trans.categoryId) {
        const category = getCategoryById(trans.categoryId);
        source = category ? `Category: ${category.name}` : `Category: ID ${trans.categoryId}`;
      }
      const payerName = trans.paidByMemberId === POT_PAYER_ID ? "Household Pot" : (members.find(m=>m.id === trans.paidByMemberId)?.name || "Unknown Member");
      csvRows.push([trans.description, trans.amount.toFixed(2), trans.date, trans.transactionType, source, payerName]); // Added type
    });

    exportToCsv(filename, csvRows);
    toast({ title: "Household Data Exported", description: `Data exported to ${filename}` });
  }, [members, contributions, householdTransactions, sharedBudgets, householdOverallSettlements, householdFinancialSummary, getHouseholdMemberNetData, getCategoryById, toast]); // Renamed

  const NONE_SHARED_BUDGET_VALUE = "__NONE__";


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members, track contributions, and oversee shared finances."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportHouseholdData} disabled={members.length === 0 && contributions.length === 0 && householdTransactions.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export Household Data
            </Button>
            <Button variant="outline" onClick={() => setIsExpenseFormOpen(true)}>
              <ListChecks className="mr-2 h-4 w-4" /> Add Shared Transaction
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
          <Suspense fallback={<div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <MemberForm
              onSave={handleSaveMember}
              onCancel={() => setIsMemberFormOpen(false)}
              isSubmitting={isSubmittingMember}
            />
          </Suspense>
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
              Record a new cash contribution from this household member to the communal pot.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ContributionForm
              onSave={handleSaveContribution}
              onCancel={() => {
                setIsContributionFormOpen(false);
                setSelectedMemberForContribution(null);
              }}
              isSubmitting={isSubmittingContribution}
              memberName={selectedMemberForContribution?.name}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Shared Transaction</DialogTitle>
            <DialogDescription>
              Fill in the details for a new shared household transaction. Select "Paid from Pot" if the communal fund is used for expenses.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TransactionForm
              onSave={handleSaveHouseholdTransaction} // Renamed
              onCancel={() => setIsExpenseFormOpen(false)}
              isSubmitting={isSubmittingTransaction} // Renamed
              showSharedBudgetLink={true}
              showSplittingFeature={true}
              availableMembersForSplitting={members}
              currentUserIdForDefaultPayer={currentUserAsHouseholdMember?.id}
              allowPotPayer={true}
            />
          </Suspense>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member, their contributions, and any associated transaction splits from the household. Settlements will be recalculated.
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
              <CardDescription>View members, their cash contributions to the pot, personal payments for group items, share of all expenses, and overall net position.</CardDescription>
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
                Household Overall Settlement
              </CardTitle>
              <CardDescription>Who owes whom to balance all household finances (cash contributions, pot-paid expenses, and member-paid shared expenses).</CardDescription>
            </CardHeader>
            <CardContent>
                <TripSettlementList
                    settlements={householdOverallSettlements}
                    tripId="household_pot_settlement" 
                    finalMemberFinancials={householdFinancialSummaries}
                    remainingCashInPot={householdFinancialSummary.remainingCashInPot}
                />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    Household Pot Cash Summary
                </CardTitle>
                <CardDescription>Cash flow of the collective household funds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Cash in Pot:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{householdFinancialSummary.totalCashInPot.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Member-Paid (Group Expenses):</span>
                    <span className="font-semibold">{DEFAULT_CURRENCY}{householdFinancialSummary.totalMemberPaidExpenses.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Spent from Pot (Expenses):</span>
                    <span className="font-semibold text-destructive">{DEFAULT_CURRENCY}{householdFinancialSummary.totalPotPaidExpenses.toFixed(2)}</span>
                </div>
                 <hr className="my-1 border-border"/>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Remaining Cash in Pot:</span>
                    <span className={cn("font-bold text-lg", householdFinancialSummary.remainingCashInPot >=0 ? "text-primary" : "text-destructive")}>{DEFAULT_CURRENCY}{householdFinancialSummary.remainingCashInPot.toFixed(2)}</span>
                </div>
                {householdFinancialSummary.totalCashInPot > 0 && (
                    <div>
                        <Progress value={householdFinancialSummary.potUsagePercentage} className="h-2 mt-1" aria-label={`Pot usage ${householdFinancialSummary.potUsagePercentage.toFixed(0)}%`}/>
                        <p className="text-xs text-muted-foreground mt-1 text-right">{householdFinancialSummary.potUsagePercentage.toFixed(0)}% of cash pot used.</p>
                    </div>
                )}
            </CardContent>
           </Card>

           <Card>
            <CardHeader>
              <CardTitle  className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                All Shared Transactions
              </CardTitle>
              <CardDescription>Log and view all transactions shared within the household, regardless of payer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Track shared utilities, groceries, rent, etc. that are attributed to the household, whether paid from the pot or by an individual for the group.</p>
            </CardContent>
             <CardFooter>
                <Button className="w-full" onClick={() => setIsExpenseFormOpen(true)}>
                  <ListChecks className="mr-2 h-4 w-4" /> Add/View Shared Transactions
                </Button>
            </CardFooter>
          </Card>


           <Card>
            <CardHeader>
              <CardTitle  className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Member Contributions
              </CardTitle>
              <CardDescription>Record and view cash contributions made by members to the communal household pot.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Keep a clear record of who has put money into the shared funds. Member specific contributions can be added via the member cards.</p>
            </CardContent>
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
                <p className="text-sm text-muted-foreground">For costs not paid from the communal pot but shared among members, use this to manage personal reimbursements. These debts are specific to individual-to-individual splits.</p>
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

    