
"use client";

import type { SharedBudget } from '@/lib/types';
import { SharedBudgetItem } from './shared-budget-item';
import { AnimatePresence, motion } from 'framer-motion';
import { WalletCards } from 'lucide-react';

interface SharedBudgetListProps {
  sharedBudgets: SharedBudget[];
  onDeleteSharedBudget: (budgetId: string) => void;
  // onEditSharedBudget: (budget: SharedBudget) => void; // For future use
}

export function SharedBudgetList({ sharedBudgets, onDeleteSharedBudget }: SharedBudgetListProps) {
  if (sharedBudgets.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <WalletCards className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Shared Budgets Yet</h3>
        <p className="text-muted-foreground">Create shared budgets for household expenses like groceries or utilities.</p>
        <img src="https://placehold.co/300x200.png" data-ai-hint="budget piggyBank" alt="Empty shared budgets" className="mx-auto mt-6 rounded-lg opacity-70" />
      </div>
    );
  }

  const sortedBudgets = [...sharedBudgets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
      <AnimatePresence initial={false}>
        {sortedBudgets.map((budget) => (
           <motion.div
            key={budget.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <SharedBudgetItem
              sharedBudget={budget}
              onDelete={onDeleteSharedBudget}
              // onEdit={onEditSharedBudget}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
