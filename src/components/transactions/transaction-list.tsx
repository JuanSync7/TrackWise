
"use client";

import type { Transaction, HouseholdTransaction, TripTransaction } from '@/lib/types';
import { TransactionItem } from './transaction-item';
import { AnimatePresence, motion } from 'framer-motion';

interface TransactionListProps {
  transactions: (Transaction | HouseholdTransaction | TripTransaction)[];
  onEditTransaction: (transaction: Transaction | HouseholdTransaction | TripTransaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  transactionContext?: 'personal' | 'household' | 'trip';
}

export function TransactionList({ transactions, onEditTransaction, onDeleteTransaction, transactionContext = 'personal' }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        
        <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
        <p className="text-muted-foreground">Start adding your transactions to see them here.</p>
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {sortedTransactions.map((transaction) => (
          <motion.div
            key={transaction.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <TransactionItem
              transaction={transaction}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              transactionContext={transactionContext}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

    
