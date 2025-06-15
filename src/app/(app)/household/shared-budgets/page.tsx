
"use client";

import React, { useState, Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import type { SharedBudget } from '@/lib/types';
import { SharedBudgetList } from '@/components/household/shared-budget-list';

const SharedBudgetForm = React.lazy(() => import('@/components/household/shared-budget-form').then(module => ({ default: module.SharedBudgetForm })));
type SharedBudgetFormValues = Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>;

export default function SharedBudgetsPage() {
  const { sharedBudgets, addSharedBudget, updateSharedBudget, deleteSharedBudget: contextDeleteSharedBudget } = useHousehold();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<SharedBudget | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  const handleSaveBudget = async (data: SharedBudgetFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingBudget) {
        const budgetToUpdate: SharedBudget = {
            ...editingBudget,
            name: data.name,
            amount: data.amount,
            period: data.period,
            description: data.description,
        };
        updateSharedBudget(budgetToUpdate);
        toast({ title: "Shared Budget Updated", description: `The shared budget "${budgetToUpdate.name}" has been successfully updated.` });
      } else {
        addSharedBudget(data);
        toast({ title: "Shared Budget Created", description: `New shared budget "${data.name}" has been successfully created.` });
      }
      setIsFormOpen(false);
      // setEditingBudget(undefined); // Already handled by onOpenChange
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save shared budget. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = (budget: SharedBudget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const handleDeleteBudget = (budgetId: string) => {
    setBudgetToDelete(budgetId);
  };

  const confirmDeleteBudget = () => {
    if (budgetToDelete) {
      const budget = sharedBudgets.find(b => b.id === budgetToDelete);
      contextDeleteSharedBudget(budgetToDelete);
      toast({ title: "Shared Budget Deleted", description: `The shared budget "${budget?.name || 'The budget'}" has been successfully deleted.` });
      setBudgetToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Shared Household Budgets"
        description="Manage budgets for expenses shared across the household, like groceries or utilities."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Shared Budget
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingBudget(undefined);
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Shared Budget' : 'Create New Shared Budget'}</DialogTitle>
            <DialogDescription>
              {editingBudget ? 'Update the details of the shared budget.' : 'Fill in the details for the new shared household budget.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SharedBudgetForm
              sharedBudget={editingBudget}
              onSave={handleSaveBudget}
              onCancel={() => { setIsFormOpen(false); setEditingBudget(undefined); }}
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
              This action cannot be undone. This will permanently delete the selected shared budget: <span className="font-semibold">{sharedBudgets.find(b => b.id === budgetToDelete)?.name || 'this budget'}</span>.
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

      <SharedBudgetList
        sharedBudgets={sharedBudgets}
        onDeleteSharedBudget={handleDeleteBudget}
        onEditSharedBudget={handleEditBudget}
      />
    </div>
  );
}
