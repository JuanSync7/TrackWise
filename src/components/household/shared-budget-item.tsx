
"use client";

import type { SharedBudget } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Trash2, WalletCards, Edit2 } from 'lucide-react'; // Removed Eye
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
// No context needed here as all data is passed via props

interface SharedBudgetItemProps {
  sharedBudget: SharedBudget;
  onDelete: (budgetId: string) => void;
  onEdit: (budget: SharedBudget) => void;
}

export function SharedBudgetItem({ sharedBudget, onDelete, onEdit }: SharedBudgetItemProps) {
  const progressPercentage = sharedBudget.amount > 0 ? Math.min((sharedBudget.currentSpending / sharedBudget.amount) * 100, 100) : 0;
  const isOverBudget = sharedBudget.currentSpending > sharedBudget.amount;
  const remainingAmount = sharedBudget.amount - sharedBudget.currentSpending;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <WalletCards className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-lg">{sharedBudget.name}</CardTitle>
              <CardDescription>
                Target: {DEFAULT_CURRENCY}{sharedBudget.amount.toFixed(2)} per {sharedBudget.period.replace(/^\w/, c => c.toUpperCase())}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Shared budget options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(sharedBudget)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(sharedBudget.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 flex-grow">
        {sharedBudget.description && (
          <p className="text-sm text-muted-foreground italic mb-3">{sharedBudget.description}</p>
        )}

        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Spent: {DEFAULT_CURRENCY}{sharedBudget.currentSpending.toFixed(2)}</span>
            <span className={cn("font-medium", isOverBudget ? "text-destructive" : "text-accent")}>
              {isOverBudget
                ? `Over by ${DEFAULT_CURRENCY}${Math.abs(remainingAmount).toFixed(2)}`
                : `Remaining: ${DEFAULT_CURRENCY}${remainingAmount.toFixed(2)}`}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={cn("h-3", isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-primary')}
            aria-label={`${sharedBudget.name} progress ${progressPercentage.toFixed(0)}%`}
          />
        </div>
        {isOverBudget && (
            <p className="text-xs text-destructive mt-1">You've exceeded the budget for {sharedBudget.name}.</p>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3 text-xs text-muted-foreground">
          Created: {format(new Date(sharedBudget.createdAt), 'PP')}
      </CardFooter>
    </Card>
  );
}
