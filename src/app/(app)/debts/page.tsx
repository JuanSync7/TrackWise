
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import type { PersonalDebt, Transaction } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, Landmark, Loader2, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input'; 

const DebtForm = React.lazy(() => import('@/components/debts/debt-form').then(module => ({ default: module.DebtForm })));
const DebtList = React.lazy(() => import('@/components/debts/debt-list').then(module => ({ default: module.DebtList })));

export default function PersonalDebtsPage() {
  const { personalDebts, addPersonalDebt, updatePersonalDebt, deletePersonalDebt, logPaymentToPersonalDebt } = usePersonalFinance();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<PersonalDebt | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [debtToLogPaymentFor, setDebtToLogPaymentFor] = useState<PersonalDebt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");


  useEffect(() => {
    if (!isFormOpen) {
      setEditingDebt(undefined);
    }
  }, [isFormOpen]);

  const handleSaveDebt = useCallback(async (data: Omit<PersonalDebt, 'id' | 'createdAt' | 'currentBalance'>) => {
    setIsSubmitting(true);
    try {
      if (editingDebt) {
        updatePersonalDebt({ ...editingDebt, ...data, currentBalance: editingDebt.currentBalance });
        toast({ title: "Debt Updated", description: `Debt "${data.name}" has been successfully updated.` });
      } else {
        addPersonalDebt(data);
        toast({ title: "Debt Added", description: `New debt "${data.name}" has been successfully added.` });
      }
      setIsFormOpen(false);
      setEditingDebt(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save personal debt. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingDebt, addPersonalDebt, updatePersonalDebt, toast]);

  const handleEditDebt = useCallback((debt: PersonalDebt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  }, []);

  const handleDeleteDebtRequest = useCallback((debtId: string) => {
    setDebtToDelete(debtId);
  }, []);

  const confirmDeleteDebt = useCallback(() => {
    if (debtToDelete) {
      const debtName = personalDebts.find(d => d.id === debtToDelete)?.name || "The debt";
      deletePersonalDebt(debtToDelete);
      toast({ title: "Debt Deleted", description: `"${debtName}" has been successfully deleted.` });
      setDebtToDelete(null);
    }
  }, [debtToDelete, personalDebts, deletePersonalDebt, toast]);

  const openFormForNew = useCallback(() => {
    setEditingDebt(undefined);
    setIsFormOpen(true);
  }, []);

  const handleOpenLogPaymentModal = useCallback((debt: PersonalDebt) => {
    setDebtToLogPaymentFor(debt);
    setPaymentAmount("");
  }, []);

  const handleConfirmLogPayment = useCallback(() => {
    if (debtToLogPaymentFor && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (amount > 0) {
        logPaymentToPersonalDebt(debtToLogPaymentFor.id, amount);
        toast({ title: "Payment Logged", description: `Payment for "${debtToLogPaymentFor.name}" recorded.` });
        setDebtToLogPaymentFor(null);
        setPaymentAmount("");
      } else {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Payment amount must be positive." });
      }
    }
  }, [debtToLogPaymentFor, paymentAmount, logPaymentToPersonalDebt, toast]);

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Personal Debts"
        description="Manage your personal loans, credit cards, and other debts."
        actions={
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Debt
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if(!isOpen) setEditingDebt(undefined);
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Edit Personal Debt' : 'Add New Personal Debt'}</DialogTitle>
            <DialogDescription>
              {editingDebt ? 'Update the details of your personal debt.' : 'Fill in the details to add a new personal debt.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-72"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <DebtForm
              debt={editingDebt}
              onSave={handleSaveDebt}
              onCancel={() => { setIsFormOpen(false); }}
              isSubmitting={isSubmitting}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!debtToDelete} onOpenChange={() => setDebtToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the personal debt: <span className="font-semibold">{personalDebts.find(d => d.id === debtToDelete)?.name || 'this debt'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDebtToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDebt} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4"/>Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!debtToLogPaymentFor} onOpenChange={() => setDebtToLogPaymentFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log Payment for {debtToLogPaymentFor?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the amount you paid towards this debt. This will update the current balance and create a corresponding expense transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="col-span-3"
              step="0.01"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDebtToLogPaymentFor(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLogPayment}>Log Payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <DebtList
          debts={personalDebts}
          onEditDebt={handleEditDebt}
          onDeleteDebt={handleDeleteDebtRequest}
          onLogPayment={handleOpenLogPaymentModal}
        />
      </Suspense>
    </div>
  );
}
