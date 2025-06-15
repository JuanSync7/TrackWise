
"use client";

import type { BudgetGoal } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // Changed context
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Removed CardFooter
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';
import { cn } from '@/lib/utils';
import React from 'react';

interface BudgetItemProps {
  budgetGoal: BudgetGoal;
  onEdit: (budgetGoal: BudgetGoal) => void;
  onDelete: (budgetGoalId: string) => void;
}

const BudgetItemComponent = ({ budgetGoal, onEdit, onDelete }: BudgetItemProps) => {
  const { getCategoryById } = usePersonalFinance(); // Changed context
  const category = getCategoryById(budgetGoal.categoryId);

  const progressPercentage = budgetGoal.amount > 0 ? Math.min((budgetGoal.currentSpending / budgetGoal.amount) * 100, 100) : 0;
  const isOverBudget = budgetGoal.currentSpending > budgetGoal.amount;
  const remainingAmount = budgetGoal.amount - budgetGoal.currentSpending;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {category && <CategoryIcon category={category} size="md" />}
            <div>
              <CardTitle className="text-lg">{category?.name || 'Uncategorized Budget'}</CardTitle>
              <CardDescription>
                {DEFAULT_CURRENCY}{budgetGoal.amount.toFixed(2)} per {budgetGoal.period.replace(/^\w/, c => c.toUpperCase())}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Budget options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budgetGoal)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(budgetGoal.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Spent: {DEFAULT_CURRENCY}{budgetGoal.currentSpending.toFixed(2)}</span>
            <span className={cn("font-medium", isOverBudget ? "text-destructive" : "text-accent")}>
              {isOverBudget
                ? `Over by ${DEFAULT_CURRENCY}${Math.abs(remainingAmount).toFixed(2)}`
                : `Remaining: ${DEFAULT_CURRENCY}${remainingAmount.toFixed(2)}`}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={cn("h-3", isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-accent')}
            aria-label={`${category?.name || 'Budget'} progress ${progressPercentage.toFixed(0)}%`}
          />
        </div>
        {isOverBudget && (
            <p className="text-xs text-destructive mt-1">You've exceeded your budget for {category?.name || 'this category'}.</p>
        )}
      </CardContent>
    </Card>
  );
}

export const BudgetItem = React.memo(BudgetItemComponent);
