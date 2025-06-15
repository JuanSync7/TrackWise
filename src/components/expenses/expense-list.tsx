
"use client";

import type { Expense, HouseholdExpense, TripExpense } from '@/lib/types'; // Use union type
import { ExpenseItem } from './expense-item';
import { AnimatePresence, motion } from 'framer-motion';

interface ExpenseListProps {
  expenses: (Expense | HouseholdExpense | TripExpense)[]; // Can be an array of any expense type
  onEditExpense: (expense: Expense | HouseholdExpense | TripExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  expenseContext?: 'personal' | 'household' | 'trip'; // Pass context for correct member name resolution in ExpenseItem
}

export function ExpenseList({ expenses, onEditExpense, onDeleteExpense, expenseContext = 'personal' }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-10">
        <img src="https://placehold.co/300x200.png" data-ai-hint="empty receipt list" alt="Empty state" className="mx-auto mb-4 rounded-lg" />
        <h3 className="text-xl font-semibold mb-2">No Expenses Yet</h3>
        <p className="text-muted-foreground">Start adding your expenses to see them here.</p>
      </div>
    );
  }

  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {sortedExpenses.map((expense) => (
          <motion.div
            key={expense.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ExpenseItem
              expense={expense}
              onEdit={onEditExpense}
              onDelete={onDeleteExpense}
              expenseContext={expenseContext} // Pass context to ExpenseItem
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
