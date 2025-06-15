
"use client";

import type { BudgetGoal } from '@/lib/types';
import { BudgetItem } from './budget-item';
import { AnimatePresence, motion } from 'framer-motion';

interface BudgetListProps {
  budgetGoals: BudgetGoal[];
  onEditBudget: (budgetGoal: BudgetGoal) => void;
  onDeleteBudget: (budgetGoalId: string) => void;
}

export function BudgetList({ budgetGoals, onEditBudget, onDeleteBudget }: BudgetListProps) {
  if (budgetGoals.length === 0) {
    return (
      <div className="text-center py-10">
        <img src="https://placehold.co/300x200.png" alt="Empty state for budgets" data-ai-hint="piggy bank" className="mx-auto mb-4 rounded-lg" />
        <h3 className="text-xl font-semibold mb-2">No Budget Goals Set</h3>
        <p className="text-muted-foreground">Create budget goals to track your spending targets.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence initial={false}>
        {budgetGoals.map((goal) => (
           <motion.div
            key={goal.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <BudgetItem
              budgetGoal={goal}
              onEdit={onEditBudget}
              onDelete={onDeleteBudget}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
