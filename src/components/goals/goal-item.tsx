
"use client";

import type { FinancialGoal } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Target, CalendarDays, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

interface GoalItemProps {
  goal: FinancialGoal;
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  onContribute: (goal: FinancialGoal) => void;
}

const GoalItemComponent = ({ goal, onEdit, onDelete, onContribute }: GoalItemProps) => {
  const progressPercentage = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const isAchieved = goal.currentAmount >= goal.targetAmount;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className={cn("h-7 w-7", isAchieved ? "text-accent" : "text-primary")} />
            <div>
              <CardTitle className="text-lg">{goal.name}</CardTitle>
              <CardDescription>
                Target: {DEFAULT_CURRENCY}{goal.targetAmount.toFixed(2)}
                {goal.deadlineDate && ` by ${format(parseISO(goal.deadlineDate), 'PP')}`}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Goal options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onContribute(goal)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Log Contribution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(goal.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Saved: {DEFAULT_CURRENCY}{goal.currentAmount.toFixed(2)}</span>
            <span className={cn("font-medium", isAchieved ? "text-accent" : "text-primary")}>
              {isAchieved ? "Achieved!" : `${progressPercentage.toFixed(0)}%`}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={cn("h-3", isAchieved ? '[&>div]:bg-accent' : '[&>div]:bg-primary')}
            aria-label={`${goal.name} progress ${progressPercentage.toFixed(0)}%`}
          />
        </div>
        {goal.notes && (
          <p className="text-xs text-muted-foreground italic mt-2 border-l-2 pl-2">{goal.notes}</p>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-2">
        Created: {format(parseISO(goal.createdAt), 'PP')}
      </CardFooter>
    </Card>
  );
}

export const GoalItem = React.memo(GoalItemComponent);
