
"use client";

import type { PersonalDebt } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Landmark, CalendarDays, Percent, CircleDollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DebtItemProps {
  debt: PersonalDebt;
  onEdit: (debt: PersonalDebt) => void;
  onDelete: (debtId: string) => void;
  onLogPayment: (debt: PersonalDebt) => void;
}

export function DebtItem({ debt, onEdit, onDelete, onLogPayment }: DebtItemProps) {
  const progressPercentage = debt.initialAmount > 0 ? Math.max(0, ((debt.initialAmount - debt.currentBalance) / debt.initialAmount) * 100) : 0;
  const isPaidOff = debt.currentBalance <= 0;

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg flex flex-col h-full", isPaidOff && "bg-accent/10 border-accent")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Landmark className={cn("h-7 w-7", isPaidOff ? "text-accent" : "text-primary")} />
            <div>
              <CardTitle className="text-lg">{debt.name}</CardTitle>
              <CardDescription>
                {debt.lender ? `${debt.lender} - ` : ''}Initial: {DEFAULT_CURRENCY}{debt.initialAmount.toFixed(2)}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Debt options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isPaidOff && (
                <DropdownMenuItem onClick={() => onLogPayment(debt)}>
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  Log Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(debt)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(debt.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Balance: {DEFAULT_CURRENCY}{debt.currentBalance.toFixed(2)}</span>
            <span className={cn("font-medium", isPaidOff ? "text-accent" : "text-primary")}>
              {isPaidOff ? "Paid Off!" : `${progressPercentage.toFixed(0)}% Paid`}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={cn("h-3", isPaidOff ? '[&>div]:bg-accent' : '[&>div]:bg-primary')}
            aria-label={`${debt.name} progress ${progressPercentage.toFixed(0)}%`}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {debt.interestRate !== undefined && (
                <div className="flex items-center gap-1">
                    <Percent className="h-3 w-3"/> Rate: {debt.interestRate.toFixed(2)}%
                </div>
            )}
            {debt.minimumPayment !== undefined && (
                <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3"/> Min. Payment: {DEFAULT_CURRENCY}{debt.minimumPayment.toFixed(2)}
                </div>
            )}
            {debt.dueDate && (
                <div className="flex items-center gap-1 col-span-2">
                    <CalendarDays className="h-3 w-3"/> Due: {debt.dueDate}
                </div>
            )}
        </div>

        {debt.notes && (
          <p className="text-xs text-muted-foreground italic mt-3 border-l-2 pl-2">{debt.notes}</p>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-2">
        Added: {format(parseISO(debt.createdAt), 'PP')}
      </CardFooter>
    </Card>
  );
}
