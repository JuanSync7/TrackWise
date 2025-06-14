
"use client";

import type { Expense, Member } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Users, UserCheck } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Badge } from '@/components/ui/badge';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  const { getCategoryById, getMemberById } = useAppContext();
  const category = getCategoryById(expense.categoryId);
  const payer = expense.paidByMemberId ? getMemberById(expense.paidByMemberId) : null;
  
  const splitWithNames = expense.isSplit && expense.splitWithMemberIds 
    ? expense.splitWithMemberIds
        .map(id => getMemberById(id)?.name)
        .filter(name => !!name)
        .join(', ')
    : null;

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
              {expense.isSplit && payer && (
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
            {expense.isSplit && (
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
