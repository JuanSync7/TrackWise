
"use client";

import React, { useState, useMemo, Suspense } from 'react'; // Added React, Suspense
import { PageHeader } from '@/components/shared/page-header';
// import { ExpenseForm } from '@/components/expenses/expense-form'; // Dynamic import
import { ExpenseList } from '@/components/expenses/expense-list';
import type { Expense, HouseholdExpense } from '@/lib/types'; // Use personal Expense type
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // Changed context
import { useHousehold } from '@/contexts/household-context'; // For household members if splitting
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, X, Download, Loader2 } from 'lucide-react'; // Added Loader2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { format as formatDate } from 'date-fns';
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
import { exportToCsv } from '@/lib/utils';
import { DEFAULT_CURRENCY } from '@/lib/constants';

const ExpenseForm = React.lazy(() => import('@/components/expenses/expense-form').then(module => ({ default: module.ExpenseForm })));

export default function ExpensesPage() {
  // Personal expenses managed by PersonalFinanceContext
  const { expenses, addExpense, updateExpense, deleteExpense: contextDeleteExpense, categories, getCategoryById } = usePersonalFinance();
  // Household members for potential future splitting of personal expenses (though not fully implemented for personal context yet)
  const { members: householdMembers, sharedBudgets: householdSharedBudgets } = useHousehold();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // This page primarily deals with *personal* expenses.
  // The ExpenseForm is generic, so we'll pass relevant props for a personal context.
  const currentUserAsHouseholdMember = useMemo(() => {
    if (!authUser || !householdMembers || householdMembers.length === 0) return undefined;
    return householdMembers.find(m =>
        (authUser.displayName && m.name.toLowerCase() === authUser.displayName.toLowerCase()) ||
        (authUser.email && m.name.toLowerCase() === authUser.email.split('@')[0].toLowerCase())
    );
  }, [authUser, householdMembers]);


  const handleSaveExpense = async (data: any) => { // data will be ExpenseFormValues
    setIsSubmitting(true);
    // Ensure it's treated as a personal expense (no household-specific fields like sharedBudgetId)
    const expenseData: Omit<Expense, 'id'> = {
      description: data.description,
      amount: data.amount,
      date: formatDate(data.date, "yyyy-MM-dd"),
      categoryId: data.categoryId,
      notes: data.notes,
      // isSplit, paidByMemberId, splitWithMemberIds are not part of personal Expense type here
    };
    try {
      if (editingExpense) {
        updateExpense({ ...editingExpense, ...expenseData });
        toast({ title: "Personal Expense Updated", description: "Your expense has been successfully updated." });
      } else {
        addExpense(expenseData);
        toast({ title: "Personal Expense Added", description: "Your new expense has been successfully recorded." });
      }
      setIsFormOpen(false);
      setEditingExpense(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save expense. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenseToDelete(expenseId);
  };

  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      contextDeleteExpense(expenseToDelete);
      toast({ title: "Expense Deleted", description: "The expense has been successfully deleted." });
      setExpenseToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingExpense(undefined);
    setIsFormOpen(true);
  }

  const handleExportExpenses = () => {
    const headerRow = [
      "ID", "Description", "Amount", "Currency", "Date",
      "Category Name", "Notes"
      // Removed household/split specific fields for personal expense export
    ];

    const dataRows = expenses.map(exp => {
      const categoryName = getCategoryById(exp.categoryId)?.name || 'N/A';
      return [
        exp.id,
        exp.description,
        exp.amount,
        DEFAULT_CURRENCY,
        exp.date,
        categoryName,
        exp.notes || '',
      ];
    });

    const filename = `trackwise_personal_expenses_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, [headerRow, ...dataRows]);
    toast({ title: "Personal Expenses Exported", description: `Expenses have been exported to ${filename}` });
  };

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Manage Your Personal Expenses"
        description="Keep track of your individual spending and categorize transactions."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportExpenses} variant="outline" disabled={expenses.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export Personal Expenses
            </Button>
            <Button onClick={openFormForNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
            </Button>
          </div>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingExpense(undefined);
        }
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Personal Expense' : 'Add New Personal Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update the details of your personal expense.' : 'Fill in the details to add a new personal expense.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ExpenseForm
              expense={editingExpense} // ExpenseForm can handle base Expense type for its fields
              onSave={handleSaveExpense}
              onCancel={() => { setIsFormOpen(false); setEditingExpense(undefined);}}
              isSubmitting={isSubmitting}
              // For personal expenses, these splitting/household features are generally hidden or disabled
              hideSharedBudgetLink={true}
              hideSplittingFeature={true} // Hide splitting for personal expenses
              // availableMembersForSplitting={householdMembers} // Not strictly needed if splitting is hidden
              // currentUserIdForDefaultPayer={currentUserAsHouseholdMember?.id} // Not strictly needed
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExpense}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExpenseList
        expenses={expenses} // Pass personal expenses
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
      />
    </div>
  );
}
