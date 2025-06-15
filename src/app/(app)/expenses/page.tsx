
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { ExpenseList } from '@/components/expenses/expense-list';
import type { Expense } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, X, Download } from 'lucide-react';
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

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense: contextDeleteExpense, categories, sharedBudgets, members, getCategoryById, getMemberById } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);


  const handleSaveExpense = async (data: any) => {
    setIsSubmitting(true);
    const expenseData = { ...data, date: formatDate(data.date, "yyyy-MM-dd") };
    try {
      if (editingExpense) {
        updateExpense({ ...editingExpense, ...expenseData });
        toast({ title: "Expense Updated", description: "Your expense has been successfully updated." });
      } else {
        addExpense(expenseData);
        toast({ title: "Expense Added", description: "Your new expense has been successfully recorded." });
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
      "Category Name", "Notes", "Shared Budget Name", "Is Split", 
      "Paid By Member Name", "Split With Member Names"
    ];

    const dataRows = expenses.map(exp => {
      const categoryName = getCategoryById(exp.categoryId)?.name || 'N/A';
      const sharedBudgetName = exp.sharedBudgetId ? sharedBudgets.find(sb => sb.id === exp.sharedBudgetId)?.name || 'N/A' : '';
      const paidByMemberName = exp.paidByMemberId ? getMemberById(exp.paidByMemberId)?.name || 'N/A' : '';
      const splitWithMemberNames = exp.splitWithMemberIds && exp.splitWithMemberIds.length > 0
        ? exp.splitWithMemberIds.map(id => getMemberById(id)?.name || 'Unknown Member').join('; ')
        : '';

      return [
        exp.id,
        exp.description,
        exp.amount,
        DEFAULT_CURRENCY,
        exp.date,
        categoryName,
        exp.notes || '',
        sharedBudgetName,
        exp.isSplit ? 'Yes' : 'No',
        paidByMemberName,
        splitWithMemberNames
      ];
    });

    const filename = `trackwise_expenses_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, [headerRow, ...dataRows]);
    toast({ title: "Expenses Exported", description: `Expenses have been exported to ${filename}` });
  };

  return (
    <div className="container mx-auto">
      <PageHeader 
        title="Manage Your Expenses"
        description="Keep track of your spending and categorize transactions."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportExpenses} variant="outline" disabled={expenses.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export Expenses
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
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update the details of your expense.' : 'Fill in the details to add a new expense.'}
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense}
            onSave={handleSaveExpense}
            onCancel={() => { setIsFormOpen(false); setEditingExpense(undefined);}}
            isSubmitting={isSubmitting}
          />
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
        expenses={expenses} 
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
      />
    </div>
  );
}
