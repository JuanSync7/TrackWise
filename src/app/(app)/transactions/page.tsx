
"use client";

import React, { useState, useMemo, Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import type { Transaction } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Loader2, TrendingDown, TrendingUp, ArrowRightLeft, Repeat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { format as formatDate, parseISO, addDays, addWeeks, addMonths, addYears, isBefore, isEqual } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const TransactionForm = React.lazy(() => import('@/components/transactions/transaction-form').then(module => ({ default: module.TransactionForm })));
const TransactionList = React.lazy(() => import('@/components/transactions/transaction-list').then(module => ({ default: module.TransactionList })));

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction: contextDeleteTransaction, getCategoryById } = usePersonalFinance();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'expenses' | 'income'>('all');

  const handleSaveTransaction = async (data: any) => { // data is TransactionFormValues & { nextRecurrenceDate?: string }
    setIsSubmitting(true);
    const transactionData: Omit<Transaction, 'id'> = {
      description: data.description,
      amount: data.amount,
      date: formatDate(data.date, "yyyy-MM-dd"),
      categoryId: data.categoryId,
      notes: data.notes,
      transactionType: data.transactionType,
      isRecurring: data.isRecurring,
      recurrencePeriod: data.isRecurring ? data.recurrencePeriod : undefined,
      recurrenceEndDate: data.isRecurring && data.recurrenceEndDate ? formatDate(data.recurrenceEndDate, "yyyy-MM-dd") : undefined,
      nextRecurrenceDate: data.nextRecurrenceDate,
    };
    try {
      if (editingTransaction) {
        updateTransaction({ ...editingTransaction, ...transactionData });
        toast({ title: "Transaction Updated", description: "Your transaction has been successfully updated." });
      } else {
        addTransaction(transactionData);
        toast({ title: "Transaction Added", description: "Your new transaction has been successfully recorded." });
      }
      setIsFormOpen(false);
      setEditingTransaction(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save transaction. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactionToDelete(transactionId);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      contextDeleteTransaction(transactionToDelete);
      toast({ title: "Transaction Deleted", description: "The transaction has been successfully deleted." });
      setTransactionToDelete(null);
    }
  };

  const openFormForNew = () => {
    setEditingTransaction(undefined);
    setIsFormOpen(true);
  }

  const handleLogUpcomingRecurring = () => {
    const today = new Date();
    let count = 0;
    transactions.forEach(t => {
      if (t.isRecurring && t.nextRecurrenceDate && (isBefore(parseISO(t.nextRecurrenceDate), today) || isEqual(parseISO(t.nextRecurrenceDate), today)) ) {
        if(t.recurrenceEndDate && isBefore(parseISO(t.recurrenceEndDate), parseISO(t.nextRecurrenceDate))) {
            // If end date is past, effectively stop recurrence by clearing nextRecurrenceDate on template
            updateTransaction({ ...t, nextRecurrenceDate: undefined });
            return; // Skip creating this instance
        }
        const newInstanceDate = parseISO(t.nextRecurrenceDate);
        addTransaction({
          ...t,
          date: formatDate(newInstanceDate, "yyyy-MM-dd"),
          isRecurring: false, 
          recurrencePeriod: undefined,
          recurrenceEndDate: undefined,
          nextRecurrenceDate: undefined,
          notes: `${t.notes || ''} (Recurring instance of: ${t.description})`.trim(),
        });

        let nextDate: Date | undefined = undefined;
        if (t.recurrencePeriod) {
            switch (t.recurrencePeriod) {
                case 'daily': nextDate = addDays(newInstanceDate, 1); break;
                case 'weekly': nextDate = addWeeks(newInstanceDate, 1); break;
                case 'monthly': nextDate = addMonths(newInstanceDate, 1); break;
                case 'yearly': nextDate = addYears(newInstanceDate, 1); break;
            }
        }
        
        let newNextRecurrenceDate: string | undefined = nextDate ? formatDate(nextDate, "yyyy-MM-dd") : undefined;
        if (t.recurrenceEndDate && newNextRecurrenceDate && isBefore(parseISO(t.recurrenceEndDate), new Date(newNextRecurrenceDate)) ) {
            newNextRecurrenceDate = undefined;
        }

        updateTransaction({ ...t, nextRecurrenceDate: newNextRecurrenceDate });
        count++;
      }
    });
    if (count > 0) {
        toast({ title: "Recurring Transactions Logged", description: `${count} recurring transaction(s) have been logged.` });
    } else {
        toast({ title: "No Due Recurring Transactions", description: "No recurring transactions were due to be logged today." });
    }
  };

  const handleExportTransactions = () => {
    const headerRow = [
      "ID", "Description", "Amount", "Currency", "Date",
      "Category Name", "Type", "Notes", "Is Recurring", "Recurrence Period", "Recurrence End Date", "Next Recurrence Date"
    ];

    const dataRows = filteredTransactions.map(trans => {
      const categoryName = getCategoryById(trans.categoryId)?.name || 'N/A';
      return [
        trans.id,
        trans.description,
        trans.amount,
        DEFAULT_CURRENCY,
        trans.date,
        categoryName,
        trans.transactionType,
        trans.notes || '',
        trans.isRecurring ? 'Yes' : 'No',
        trans.recurrencePeriod || '',
        trans.recurrenceEndDate || '',
        trans.nextRecurrenceDate || '',
      ];
    });

    const filename = `trackwise_transactions_${activeTab}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    exportToCsv(filename, [headerRow, ...dataRows]);
    toast({ title: "Transactions Exported", description: `Transactions have been exported to ${filename}` });
  };
  
  const filteredTransactions = useMemo(() => {
    let baseTransactions = transactions.filter(t => !t.isRecurring); 
    if (activeTab !== 'all') {
        baseTransactions = baseTransactions.filter(t => t.transactionType === activeTab);
    }
    return baseTransactions;
  }, [transactions, activeTab]);

  const recurringTemplates = useMemo(() => transactions.filter(t => t.isRecurring), [transactions]);
  const dueRecurringTemplatesCount = useMemo(() => {
    const today = new Date();
    return recurringTemplates.filter(t => t.nextRecurrenceDate && (isBefore(parseISO(t.nextRecurrenceDate), today) || isEqual(parseISO(t.nextRecurrenceDate), today))).length;
  }, [recurringTemplates]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Manage Your Transactions"
        description="Keep track of your income and expenses. Log recurring transactions as they occur."
        actions={
          <div className="flex gap-2 flex-wrap">
             <Button onClick={handleLogUpcomingRecurring} variant="outline" disabled={dueRecurringTemplatesCount === 0}>
              <Repeat className="mr-2 h-4 w-4" /> Log Upcoming ({dueRecurringTemplatesCount})
            </Button>
            <Button onClick={handleExportTransactions} variant="outline" disabled={filteredTransactions.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export View
            </Button>
            <Button onClick={openFormForNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Transaction
            </Button>
          </div>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingTransaction(undefined);
        }
        setIsFormOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Update the details of your transaction.' : 'Fill in the details to add a new transaction. Set up recurring transactions if needed.'}
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TransactionForm
              transaction={editingTransaction}
              onSave={handleSaveTransaction}
              onCancel={() => { setIsFormOpen(false); setEditingTransaction(undefined);}}
              isSubmitting={isSubmitting}
              hideSharedBudgetLink={true} // Not applicable for personal transactions page
              hideSplittingFeature={true} // Not applicable for personal transactions page
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected transaction. If it's a recurring template, its future occurrences will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTransaction} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'expenses' | 'income')} className="mb-4">
        <TabsList className="grid w-full grid-cols-3 md:max-w-sm">
          <TabsTrigger value="all" className="flex items-center gap-1"><ArrowRightLeft className="h-4 w-4" />All</TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1"><TrendingDown className="h-4 w-4 text-destructive" />Expenses</TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-accent" />Income</TabsTrigger>
        </TabsList>
      </Tabs>

      <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <TransactionList
          transactions={filteredTransactions}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </Suspense>
      
      {recurringTemplates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary"/> Recurring Transaction Templates
          </h2>
           <p className="text-sm text-muted-foreground mb-4">
            These are templates for your recurring income or expenses. Actual transactions will be logged based on their 'Next Recurrence Date' when you click 'Log Upcoming'.
          </p>
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TransactionList
              transactions={recurringTemplates}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </Suspense>
        </div>
      )}

    </div>
  );
}
