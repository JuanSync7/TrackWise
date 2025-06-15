
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import type { FinancialGoal } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, Target, Loader2, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { GoalList } from '@/components/goals/goal-list';

const GoalForm = React.lazy(() => import('@/components/goals/goal-form').then(module => ({ default: module.GoalForm })));

export default function FinancialGoalsPage() {
  const { financialGoals, addFinancialGoal, updateFinancialGoal, deleteFinancialGoal, contributeToFinancialGoal } = usePersonalFinance();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [goalToContribute, setGoalToContribute] = useState<FinancialGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>("");


  useEffect(() => {
    if (!isFormOpen) {
      setEditingGoal(undefined);
    }
  }, [isFormOpen]);

  const handleSaveGoal = async (data: Omit<FinancialGoal, 'id' | 'createdAt' | 'currentAmount'>) => {
    setIsSubmitting(true);
    try {
      if (editingGoal) {
        updateFinancialGoal({ ...editingGoal, ...data });
        toast({ title: "Goal Updated", description: `Goal "${data.name}" has been successfully updated.` });
      } else {
        addFinancialGoal(data);
        toast({ title: "Goal Set", description: `New goal "${data.name}" has been successfully set.` });
      }
      setIsFormOpen(false);
      setEditingGoal(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save financial goal. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDeleteGoalRequest = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const confirmDeleteGoal = () => {
    if (goalToDelete) {
      const goalName = financialGoals.find(g => g.id === goalToDelete)?.name || "The goal";
      deleteFinancialGoal(goalToDelete);
      toast({ title: "Goal Deleted", description: `"${goalName}" has been successfully deleted.` });
      setGoalToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingGoal(undefined);
    setIsFormOpen(true);
  }

  const handleOpenContributeModal = (goal: FinancialGoal) => {
    setGoalToContribute(goal);
    setContributionAmount("");
  };

  const handleConfirmContribution = () => {
    if (goalToContribute && contributionAmount) {
      const amount = parseFloat(contributionAmount);
      if (amount > 0) {
        contributeToFinancialGoal(goalToContribute.id, amount);
        toast({ title: "Contribution Logged", description: `Contribution to "${goalToContribute.name}" recorded.` });
        setGoalToContribute(null);
        setContributionAmount("");
      } else {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Contribution amount must be positive." });
      }
    }
  };

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Financial Goals"
        description="Set and track your progress towards your financial aspirations."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Set New Goal
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Financial Goal' : 'Set New Financial Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Update the details of your financial goal.' : 'Fill in the details to set a new financial goal.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GoalForm
              goal={editingGoal}
              onSave={handleSaveGoal}
              onCancel={() => { setIsFormOpen(false); }}
              isSubmitting={isSubmitting}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the financial goal: <span className="font-semibold">{financialGoals.find(g => g.id === goalToDelete)?.name || 'this goal'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGoalToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4"/>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!goalToContribute} onOpenChange={() => setGoalToContribute(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log Contribution to {goalToContribute?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the amount you're contributing to this goal. This will update the current amount saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <input
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              placeholder="Enter amount"
              className="col-span-3 border p-2 rounded-md"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGoalToContribute(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmContribution}>Log Contribution</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <GoalList
        goals={financialGoals}
        onEditGoal={handleEditGoal}
        onDeleteGoal={handleDeleteGoalRequest}
        onContributeToGoal={handleOpenContributeModal}
      />
    </div>
  );
}
