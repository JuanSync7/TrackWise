
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, DollarSign, ClipboardList, WalletCards, DivideSquare, TrendingDown, TrendingUp, Banknote, ListChecks } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import type { Member, Contribution } from '@/lib/types';
import { MemberForm } from '@/components/household/member-form';
import { MemberList } from '@/components/household/member-list';
import { ContributionForm, type ContributionFormValues } from '@/components/household/contribution-form';
import { ExpenseForm, type ExpenseFormValues as ExpenseFormValuesType } from '@/components/expenses/expense-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY, HOUSEHOLD_EXPENSE_CATEGORY_ID } from '@/lib/constants';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function HouseholdPage() {
  const { 
    members, addMember, deleteMember: contextDeleteMember, 
    addContribution, getMemberTotalContribution, getTotalHouseholdSpending,
    addExpense 
  } = useAppContext();
  const { toast } = useToast();

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false); 
  const [selectedMemberForContribution, setSelectedMemberForContribution] = useState<Member | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const handleSaveMember = async (data: Omit<Member, 'id'>) => {
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
  };

  const handleDeleteMember = (memberId: string) => {
    setMemberToDelete(memberId);
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      const member = members.find(m => m.id === memberToDelete);
      contextDeleteMember(memberToDelete);
      toast({ title: "Member Deleted", description: `${member?.name || 'The member'} has been removed from the household.` });
      setMemberToDelete(null);
    }
  };
  
  const openMemberFormForNew = () => {
    setIsMemberFormOpen(true);
  };

  const handleAddContributionClick = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setSelectedMemberForContribution(member);
      setIsContributionFormOpen(true);
    }
  };

  const handleSaveContribution = async (data: ContributionFormValues) => {
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
  };

  const handleSaveExpense = async (data: ExpenseFormValuesType) => {
    setIsSubmittingExpense(true);
    let expenseData = { ...data, date: format(data.date, "yyyy-MM-dd") };

    if (!expenseData.categoryId && (!expenseData.sharedBudgetId || expenseData.sharedBudgetId === "__NONE__")) {
      expenseData.categoryId = HOUSEHOLD_EXPENSE_CATEGORY_ID;
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
  };
  
  const totalHouseholdContributions = members.reduce((sum, member) => sum + getMemberTotalContribution(member.id), 0);
  const totalPotSpending = getTotalHouseholdSpending();
  const remainingInPot = totalHouseholdContributions - totalPotSpending;
  const potUsagePercentage = totalHouseholdContributions > 0 ? Math.min((totalPotSpending / totalHouseholdContributions) * 100, 100) : 0;


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members, track contributions, and oversee shared finances."
        actions={
          <div className="flex gap-2">
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
              Record a new contribution from this household member.
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
              Fill in the details for a new shared household expense. If no specific category or shared budget is chosen, it will be categorized as 'Household Expenses' and affect the pot.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSave={handleSaveExpense}
            onCancel={() => setIsExpenseFormOpen(false)}
            isSubmitting={isSubmittingExpense}
          />
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member, their contributions, and any associated expense splits from the household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Household Members ({members.length})
              </CardTitle>
              <CardDescription>View and manage your household members and their contributions. Log shared expenses using the "Add Shared Expense" button above. These will automatically be categorized as 'Household Expenses' if no other category/shared budget is selected, and will affect the pot.</CardDescription>
            </CardHeader>
            <CardContent>
              <MemberList 
                members={members}
                onDeleteMember={handleDeleteMember}
                onAddContribution={handleAddContributionClick}
                totalHouseholdContributions={totalHouseholdContributions}
                remainingHouseholdPot={remainingInPot}
              />
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
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-accent"/>Total Contributions:</span>
                    <span className="font-semibold text-accent">{DEFAULT_CURRENCY}{totalHouseholdContributions.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-destructive"/>Total Shared Spending:</span>
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
                <p className="text-xs text-muted-foreground pt-1">Shared spending includes expenses linked to Shared Budgets and those categorized as 'Household Expenses'.</p>
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
                <p className="text-sm text-muted-foreground">Define spending targets for categories like groceries, utilities, or rent that are shared by the household. Track spending against these directly.</p>
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
                    Expense Splitting
                </CardTitle>
                <CardDescription>Easily split shared expenses among members and track reimbursements.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Mark expenses as shared and track who owes whom to simplify household finances.</p>
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

    