
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { BudgetForm } from '@/components/budgets/budget-form';
import { BudgetList } from '@/components/budgets/budget-list';
import type { BudgetGoal } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function BudgetsPage() {
  const { budgetGoals, addBudgetGoal, updateBudgetGoal, deleteBudgetGoal: contextDeleteBudget } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetGoal | undefined>(undefined); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);


  const handleSaveBudget = async (data: Omit<BudgetGoal, 'id' | 'currentSpending'>) => {
    setIsSubmitting(true);
    try {
      if (editingBudget) {
        // updateBudgetGoal({ ...editingBudget, ...data }); // Implement update if needed
        toast({ title: "Budget Updated", description: "Your budget goal has been successfully updated." });
      } else {
        addBudgetGoal(data);
        toast({ title: "Budget Goal Set", description: "Your new budget goal has been successfully set." });
      }
      setIsFormOpen(false);
      setEditingBudget(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save budget goal. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = (budget: BudgetGoal) => {
    // For future implementation
    // setEditingBudget(budget);
    // setIsFormOpen(true);
    toast({title: "Edit Not Implemented", description: "Editing budget goals will be available in a future update."});
  };

  const handleDeleteBudget = (budgetId: string) => {
    setBudgetToDelete(budgetId);
  };

  const confirmDeleteBudget = () => {
    if (budgetToDelete) {
      contextDeleteBudget(budgetToDelete);
      toast({ title: "Budget Goal Deleted", description: "The budget goal has been successfully deleted." });
      setBudgetToDelete(null);
    }
  };
  
  const openFormForNew = () => {
    setEditingBudget(undefined);
    setIsFormOpen(true);
  }


  return (
    <div className="container mx-auto">
      <PageHeader 
        title="Set Your Budget Goals"
        description="Define your spending limits for different categories and track your progress."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Set New Budget
          </Button>
        }
      />
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
         if (!isOpen) {
          setEditingBudget(undefined);
        }
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget Goal' : 'Set New Budget Goal'}</DialogTitle>
            <DialogDescription>
              {editingBudget ? 'Update the details of your budget goal.' : 'Fill in the details to set a new budget goal.'}
            </DialogDescription>
          </DialogHeader>
          <BudgetForm
            budgetGoal={editingBudget}
            onSave={handleSaveBudget}
            onCancel={() => { setIsFormOpen(false); setEditingBudget(undefined);}}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected budget goal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBudget}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {budgetGoals.length > 0 && (
        <div className="mb-6">
          <BudgetGoalPieChart />
        </div>
      )}

      <BudgetList 
        budgetGoals={budgetGoals}
        onEditBudget={handleEditBudget}
        onDeleteBudget={handleDeleteBudget}
      />
    </div>
  );
}
