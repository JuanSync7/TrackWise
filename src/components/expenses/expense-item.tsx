"use client";

import type { Expense } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  const { getCategoryById } = useAppContext();
  const category = getCategoryById(expense.categoryId);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {category && <CategoryIcon category={category} />}
            <div>
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{expense.description}</h3>
              <p className="text-sm text-muted-foreground">
                {category?.name || 'Uncategorized'} &bull; {format(new Date(expense.date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <p className="text-lg font-bold text-primary">
              {DEFAULT_CURRENCY}{expense.amount.toFixed(2)}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
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
        </div>
        {expense.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-border pl-2">
            {expense.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
