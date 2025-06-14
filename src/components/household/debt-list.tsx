
"use client";

import type { Debt } from '@/lib/types';
import { DebtItem } from './debt-item';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DivideSquare } from 'lucide-react';

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
    if (a.isSettled === b.isSettled) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.isSettled ? 1 : -1; // Unsettled debts first
  });

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{title} ({sortedDebts.length})</h2>
      <ScrollArea className="h-[60vh] pr-3">
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
