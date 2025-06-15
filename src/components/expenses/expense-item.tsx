
"use client";

import type { Expense, HouseholdExpense, TripExpense, Member } from '@/lib/types'; // Adjusted types
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // For categories
import { useHousehold } from '@/contexts/household-context'; // For household member names
import { useTrips } from '@/contexts/trip-context'; // For trip member names
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardFooter
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Users, UserCheck } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Badge } from '@/components/ui/badge';

interface ExpenseItemProps {
  expense: Expense | HouseholdExpense | TripExpense; // Can be any type
  onEdit: (expense: Expense | HouseholdExpense | TripExpense) => void;
  onDelete: (expenseId: string) => void;
  // Add a prop to indicate context if needed for specific member lookups
  // For now, try to resolve member names from available contexts
  expenseContext?: 'personal' | 'household' | 'trip';
}

export function ExpenseItem({ expense, onEdit, onDelete, expenseContext = 'personal' }: ExpenseItemProps) {
  const { getCategoryById } = usePersonalFinance();
  const { getMemberById: getHouseholdMemberById } = useHousehold();
  const { getTripMemberById } = useTrips();

  const category = getCategoryById(expense.categoryId);

  let payer: Member | undefined | null = null;
  let splitWithNames: string | null = null;

  if ('isSplit' in expense && expense.isSplit) {
    const expWithSplit = expense as HouseholdExpense | TripExpense;
    if (expWithSplit.paidByMemberId) {
      if (expenseContext === 'household') {
        payer = getHouseholdMemberById(expWithSplit.paidByMemberId);
      } else if (expenseContext === 'trip') {
        payer = getTripMemberById(expWithSplit.paidByMemberId);
      }
    }

    if (expWithSplit.splitWithMemberIds && expWithSplit.splitWithMemberIds.length > 0) {
      splitWithNames = expWithSplit.splitWithMemberIds
        .map(id => {
          if (expenseContext === 'household') return getHouseholdMemberById(id)?.name;
          if (expenseContext === 'trip') return getTripMemberById(id)?.name;
          return null;
        })
        .filter(name => !!name)
        .join(', ');
    }
  }


  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            {category && <CategoryIcon category={category} />}
            <div className="flex-grow min-w-0">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate" title={expense.description}>{expense.description}</h3>
              <p className="text-sm text-muted-foreground">
                {category?.name || 'Uncategorized'} &bull; {format(new Date(expense.date), 'MMM d, yyyy')}
              </p>
              {'isSplit' in expense && expense.isSplit && payer && (
                 <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
                    <UserCheck className="h-3 w-3 mr-1 text-primary" /> Paid by: {payer.name}
                 </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end ml-2 shrink-0">
             <p className="text-lg font-bold text-primary">
              {DEFAULT_CURRENCY}{expense.amount.toFixed(2)}
            </p>
            {'isSplit' in expense && expense.isSplit && (
              <Badge variant="outline" className="mt-1 text-xs flex items-center gap-1 border-primary text-primary">
                <Users className="h-3 w-3"/> Split
              </Badge>
            )}
          </div>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Expense options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(expense)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(expense.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        {expense.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-border pl-2">
            {expense.notes}
          </p>
        )}
        {splitWithNames && (
            <p className="mt-1 text-xs text-muted-foreground">
                Shared with: {splitWithNames}
            </p>
        )}
      </CardContent>
    </Card>
  );
}
