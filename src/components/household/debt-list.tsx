
"use client";

import type { Debt } from '@/lib/types';
import { DebtItem } from './debt-item';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DivideSquare } from 'lucide-react';
import { parseISO } from 'date-fns';

interface DebtListProps {
  debts: Debt[];
  title: string;
  emptyStateMessage: string;
  emptyStateImageHint?: string;
}

export function DebtList({ debts, title, emptyStateMessage, emptyStateImageHint = "piggyBank balance" }: DebtListProps) {
  if (debts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <DivideSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">{title}</h3>
        <p className="text-muted-foreground">{emptyStateMessage}</p>
        <img src={`https://placehold.co/300x200.png`} data-ai-hint={emptyStateImageHint} alt="Empty state for debts" className="mx-auto mt-6 rounded-lg opacity-70" />
      </div>
    );
  }

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.isSettled !== b.isSettled) {
      return a.isSettled ? 1 : -1; // Unsettled debts first
    }
    // If both are settled or both are unsettled
    if (a.isSettled) { // Both settled, sort by settledAt (newest first), then createdAt
      const settledA = a.settledAt ? parseISO(a.settledAt).getTime() : 0;
      const settledB = b.settledAt ? parseISO(b.settledAt).getTime() : 0;
      if (settledB !== settledA) return settledB - settledA;
    }
    // Sort by createdAt (newest first) for unsettled, or as secondary for settled
    return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime();
  });

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{title} ({sortedDebts.length})</h2>
      <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-350px)] pr-3"> {/* Adjusted height */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {sortedDebts.map((debt) => (
              <motion.div
                key={debt.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <DebtItem debt={debt} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
