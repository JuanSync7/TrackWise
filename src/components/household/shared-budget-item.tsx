
"use client";

import type { SharedBudget } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, WalletCards, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface SharedBudgetItemProps {
  sharedBudget: SharedBudget;
  onDelete: (budgetId: string) => void;
  // onEdit: (budget: SharedBudget) => void; // For future use
}

export function SharedBudgetItem({ sharedBudget, onDelete }: SharedBudgetItemProps) {
  // In a full implementation, you'd calculate current spending against this budget
  const currentSpending = 0; // Placeholder
  const progressPercentage = sharedBudget.amount > 0 ? Math.min((currentSpending / sharedBudget.amount) * 100, 100) : 0;
  const isOverBudget = currentSpending > sharedBudget.amount;
  const remainingAmount = sharedBudget.amount - currentSpending;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <WalletCards className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-lg">{sharedBudget.name}</CardTitle>
              <CardDescription>
                {DEFAULT_CURRENCY}{sharedBudget.amount.toFixed(2)} per {sharedBudget.period.replace(/^\w/, c => c.toUpperCase())}
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
              <DropdownMenuItem disabled> {/* Edit not implemented yet */}
                <Eye className="mr-2 h-4 w-4" />
                View Details (Soon)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(sharedBudget.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {sharedBudget.description && (
          <p className="text-sm text-muted-foreground italic mb-2">{sharedBudget.description}</p>
        )}
        <div className="text-xs text-muted-foreground">
          Created: {format(new Date(sharedBudget.createdAt), 'PP')}
        </div>
        <div className="mt-2 p-3 bg-accent/10 rounded-md">
            <div className="flex items-center gap-2 text-sm text-accent-foreground/80">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                    <p className="font-semibold">Tracking & Allocation Coming Soon!</p>
                    <p className="text-xs">Currently, you can define shared budgets. Linking expenses and allocating funds from the household pot to these budgets is under development.</p>
                </div>
            </div>
        </div>
      </CardContent>
      {/* 
      <CardFooter className="pt-0">
        // Placeholder for progress if we had spending tracking
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span>Spent: {DEFAULT_CURRENCY}{currentSpending.toFixed(2)}</span>
                <span>Remaining: {DEFAULT_CURRENCY}{remainingAmount.toFixed(2)}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardFooter>
      */}
    </Card>
  );
}
