
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import type { BudgetGoal } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BudgetGoalPieChart } from '@/components/dashboard/budget-goal-pie-chart';
import { exportToCsv } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/constants';

const BudgetForm = React.lazy(() => import('@/components/budgets/budget-form').then(module => ({ default: module.BudgetForm })));
const BudgetList = React.lazy(() => import('@/components/budgets/budget-list').then(module => ({ default: module.BudgetList })));


export default function BudgetsPage() {
  const { budgetGoals, addBudgetGoal, updateBudgetGoal, deleteBudgetGoal: contextDeleteBudget, getCategoryById } = usePersonalFinance();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetGoal | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isFormOpen) {
      setEditingBudget(undefined);
    }
  }, [isFormOpen]);


  const handleSaveBudget = useCallback(async (data: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setIsSubmitting(true);
    try {
      const categoryName = getCategoryById(data.categoryId)?.name || 'Category';
      if (editingBudget) {
        updateBudgetGoal({ ...editingBudget, ...data });
        toast({ title: "Budget Updated", description: `Budget goal for "${categoryName}" has been successfully updated.` });
      } else {
        addBudgetGoal(data);
        toast({ title: "Budget Goal Set", description: `New budget goal for "${categoryName}" has been successfully set.` });
      }
      setIsFormOpen(false);
      setEditingBudget(undefined); 
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save budget goal. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingBudget, addBudgetGoal, updateBudgetGoal, getCategoryById, toast]);

  const handleEditBudget = useCallback((budget: BudgetGoal) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  }, []);

  const handleDeleteBudgetRequest = useCallback((budgetId: string) => {
    setBudgetToDelete(budgetId);
  }, []);

  const confirmDeleteBudget = useCallback(() => {
    if (budgetToDelete) {
      const budgetName = getCategoryById(budgetGoals.find(b => b.id === budgetToDelete)?.categoryId || "")?.name || "The budget";
      contextDeleteBudget(budgetToDelete);
      toast({ title: "Budget Goal Deleted", description: `"${budgetName}" goal has been successfully deleted.` });
      setBudgetToDelete(null);
    }
  }, [budgetToDelete, budgetGoals, contextDeleteBudget, getCategoryById, toast]);

  const openFormForNew = useCallback(() => {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  }, []);

  const handleExportBudgetGoals = useCallback(() => {
    const headerRow = [
      "ID", "Category Name", "Budgeted Amount", "Period", "Current Spending (Expenses)", "Currency"
    ];

    const dataRows = budgetGoals.map(goal => {
      const categoryName = getCategoryById(goal.categoryId)?.name || 'N/A';
      return [
        goal.id,
        categoryName,
        goal.amount,
        goal.period,
        goal.currentSpending,
        DEFAULT_CURRENCY
      ];
    });

    const filename = `trackwise_budget_goals_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, [headerRow, ...dataRows]);
    toast({ title: "Budget Goals Exported", description: `Budget goals have been exported to ${filename}` });
  }, [budgetGoals, getCategoryById, toast]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Set Your Budget Goals"
        description="Define your spending limits for different categories and track your progress."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportBudgetGoals} variant="outline" disabled={budgetGoals.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export Budget Goals
            </Button>
            <Button onClick={openFormForNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Set New Budget
            </Button>
          </div>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingBudget(undefined); 
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget Goal' : 'Set New Budget Goal'}</DialogTitle>
            <DialogDescription>
              {editingBudget ? 'Update the details of your budget goal.' : 'Fill in the details to set a new budget goal.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <BudgetForm
              budgetGoal={editingBudget}
              onSave={handleSaveBudget}
              onCancel={() => { setIsFormOpen(false);}}
              isSubmitting={isSubmitting}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the budget goal for <span className="font-semibold">{getCategoryById(budgetGoals.find(b=>b.id === budgetToDelete)?.categoryId || "")?.name || 'this category'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBudget} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4"/>Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {budgetGoals.length > 0 && (
        <div className="mb-6">
          <BudgetGoalPieChart />
        </div>
      )}

      <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <BudgetList
          budgetGoals={budgetGoals}
          onEditBudget={handleEditBudget}
          onDeleteBudget={handleDeleteBudgetRequest}
        />
      </Suspense>
    </div>
  );
}
