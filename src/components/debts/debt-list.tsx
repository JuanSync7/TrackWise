
"use client";

import type { PersonalDebt } from '@/lib/types';
import { DebtItem } from './debt-item';
import { AnimatePresence, motion } from 'framer-motion';
import { Landmark } from 'lucide-react';

interface DebtListProps {
  debts: PersonalDebt[];
  onEditDebt: (debt: PersonalDebt) => void;
  onDeleteDebt: (debtId: string) => void;
  onLogPayment: (debt: PersonalDebt) => void;
}

export function DebtList({ debts, onEditDebt, onDeleteDebt, onLogPayment }: DebtListProps) {
  if (debts.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <Landmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Personal Debts Added Yet</h3>
        <p className="text-muted-foreground">Click "Add New Debt" to start tracking your loans or credit cards.</p>
        <img src="https://placehold.co/400x250.png" data-ai-hint="financial freedom piggybank" alt="No debts illustration" className="mx-auto mt-8 rounded-lg opacity-70" />
      </div>
    );
  }

  const sortedDebts = [...debts].sort((a, b) => {
    // Sort by not paid off first, then by current balance (higher balance first), then by creation date (newest first)
    if (a.currentBalance > 0 && b.currentBalance <= 0) return -1;
    if (a.currentBalance <= 0 && b.currentBalance > 0) return 1;
    if (a.currentBalance > 0 && b.currentBalance > 0) { // Both have balance
        const balanceDiff = b.currentBalance - a.currentBalance;
        if (balanceDiff !== 0) return balanceDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
      <AnimatePresence initial={false}>
        {sortedDebts.map((debt) => (
           <motion.div
            key={debt.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <DebtItem
              debt={debt}
              onEdit={onEditDebt}
              onDelete={onDeleteDebt}
              onLogPayment={onLogPayment}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
