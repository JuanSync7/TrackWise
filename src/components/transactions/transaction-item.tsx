
"use client";

import type { Transaction, HouseholdTransaction, TripTransaction, Member } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { useHousehold } from '@/contexts/household-context';
import { useTrips } from '@/contexts/trip-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Users, UserCheck, TrendingDown, TrendingUp, Repeat } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

interface TransactionItemProps {
  transaction: Transaction | HouseholdTransaction | TripTransaction;
  onEdit: (transaction: Transaction | HouseholdTransaction | TripTransaction) => void;
  onDelete: (transactionId: string) => void;
  transactionContext?: 'personal' | 'household' | 'trip';
}

const TransactionItemComponent = ({ transaction, onEdit, onDelete, transactionContext = 'personal' }: TransactionItemProps) => {
  const { getCategoryById } = usePersonalFinance();
  const { getMemberById: getHouseholdMemberById } = useHousehold();
  const { getTripMemberById } = useTrips();

  const category = getCategoryById(transaction.categoryId);

  let payer: Member | undefined | null = null;
  let splitWithNames: string | null = null;
  const isExpense = transaction.transactionType === 'expense';

  if (isExpense && 'isSplit' in transaction && transaction.isSplit) {
    const transWithSplit = transaction as HouseholdTransaction | TripTransaction;
    if (transWithSplit.paidByMemberId) {
      if (transactionContext === 'household') {
        payer = getHouseholdMemberById(transWithSplit.paidByMemberId);
      } else if (transactionContext === 'trip') {
        payer = getTripMemberById(transWithSplit.paidByMemberId);
      }
    }

    if (transWithSplit.splitWithMemberIds && transWithSplit.splitWithMemberIds.length > 0) {
      splitWithNames = transWithSplit.splitWithMemberIds
        .map(id => {
          if (transactionContext === 'household') return getHouseholdMemberById(id)?.name;
          if (transactionContext === 'trip') return getTripMemberById(id)?.name;
          return null;
        })
        .filter(name => !!name)
        .join(', ');
    }
  }

  const TransactionTypeIcon = isExpense ? TrendingDown : TrendingUp;
  const amountColor = isExpense ? 'text-destructive' : 'text-accent';

  const recurrenceText = useMemo(() => {
    if (!transaction.isRecurring || !transaction.recurrencePeriod) return null;
    let text = `Repeats ${transaction.recurrencePeriod}`;
    if (transaction.nextRecurrenceDate) {
      try {
        text += ` (Next: ${format(parseISO(transaction.nextRecurrenceDate), 'MMM d, yyyy')})`;
      } catch (e) {
         console.error("Error parsing nextRecurrenceDate for display:", transaction.nextRecurrenceDate, e);
      }
    }
    if (transaction.recurrenceEndDate) {
      try {
        text += ` until ${format(parseISO(transaction.recurrenceEndDate), 'MMM d, yyyy')}`;
      } catch (e) {
        console.error("Error parsing recurrenceEndDate for display:", transaction.recurrenceEndDate, e);
      }
    }
    return text;
  }, [transaction.isRecurring, transaction.recurrencePeriod, transaction.nextRecurrenceDate, transaction.recurrenceEndDate]);


  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            {category && <CategoryIcon category={category} />}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1.5">
                 <TransactionTypeIcon className={cn("h-4 w-4", amountColor)} />
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate" title={transaction.description}>{transaction.description}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {category?.name || 'Uncategorized'} &bull; {format(new Date(transaction.date), 'MMM d, yyyy')}
              </p>
              {isExpense && 'isSplit' in transaction && transaction.isSplit && payer && (
                 <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
                    <UserCheck className="h-3 w-3 mr-1 text-primary" /> Paid by: {payer.name}
                 </p>
              )}
              {transaction.isRecurring && recurrenceText && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Repeat className="h-3 w-3 text-blue-500" /> {recurrenceText}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end ml-2 shrink-0">
             <p className={cn("text-lg font-bold", amountColor)}>
              {isExpense ? '-' : '+'}{DEFAULT_CURRENCY}{transaction.amount.toFixed(2)}
            </p>
            {isExpense && 'isSplit' in transaction && transaction.isSplit && (
              <Badge variant="outline" className="mt-1 text-xs flex items-center gap-1 border-primary text-primary">
                <Users className="h-3 w-3"/> Split
              </Badge>
            )}
          </div>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Transaction options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transaction)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        {transaction.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-border pl-2">
            {transaction.notes}
          </p>
        )}
        {isExpense && splitWithNames && (
            <p className="mt-1 text-xs text-muted-foreground">
                Shared with: {splitWithNames}
            </p>
        )}
      </CardContent>
    </Card>
  );
}

export const TransactionItem = React.memo(TransactionItemComponent);
