
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { BudgetGoal } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // Changed to usePersonalFinance
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { CategoryIcon } from '@/components/shared/category-icon';

export function BudgetProgressCard() {
  const { budgetGoals, getCategoryById } = usePersonalFinance(); // Changed to usePersonalFinance

  if (budgetGoals.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Budget Goals</CardTitle>
          <CardDescription>Your progress towards budget goals will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[150px]">
          <p className="text-muted-foreground">No budget goals set yet. Go to Budgets to add some!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Budget Goals Progress</CardTitle>
        <CardDescription>Track your progress towards your financial goals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgetGoals.map((goal) => {
          const category = getCategoryById(goal.categoryId);
          const progressPercentage = goal.amount > 0 ? Math.min((goal.currentSpending / goal.amount) * 100, 100) : 0;
          const isOverBudget = goal.currentSpending > goal.amount;

          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {category && <CategoryIcon category={category} size="sm" />}
                  <span className="text-sm font-medium">{category?.name || 'Unknown Category'}</span>
                </div>
                <span className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {DEFAULT_CURRENCY}{goal.currentSpending.toFixed(2)} / {DEFAULT_CURRENCY}{goal.amount.toFixed(2)}
                </span>
              </div>
              <Progress
                value={progressPercentage}
                className={isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-accent'}
                aria-label={`${category?.name || 'Budget'} progress ${progressPercentage.toFixed(0)}%`}
              />
              {isOverBudget && <p className="text-xs text-destructive mt-1">You've exceeded your budget for {category?.name || 'this category'}.</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
