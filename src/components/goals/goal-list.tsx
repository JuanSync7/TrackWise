
"use client";

import type { FinancialGoal } from '@/lib/types';
import { GoalItem } from './goal-item';
import { AnimatePresence, motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface GoalListProps {
  goals: FinancialGoal[];
  onEditGoal: (goal: FinancialGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onContributeToGoal: (goal: FinancialGoal) => void;
}

export function GoalList({ goals, onEditGoal, onDeleteGoal, onContributeToGoal }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Financial Goals Set Yet</h3>
        <p className="text-muted-foreground">Click "Set New Goal" to start planning for your future!</p>
        
      </div>
    );
  }

  const sortedGoals = [...goals].sort((a, b) => {
    // Sort by deadline first (earlier deadlines first), then by creation date (newest first)
    if (a.deadlineDate && b.deadlineDate) {
      const diff = new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
      if (diff !== 0) return diff;
    } else if (a.deadlineDate) {
      return -1; // Goals with deadlines come before those without
    } else if (b.deadlineDate) {
      return 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
      <AnimatePresence initial={false}>
        {sortedGoals.map((goal) => (
           <motion.div
            key={goal.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <GoalItem
              goal={goal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              onContribute={onContributeToGoal}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

