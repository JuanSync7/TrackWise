
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { CategoryIcon } from '@/components/shared/category-icon';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface BudgetPerformanceData {
  category: Category | undefined;
  budgetId: string;
  budgetedAmount: number;
  actualSpending: number;
  difference: number;
  status: 'Over Budget' | 'Under Budget' | 'On Track' | 'No Spending';
}

export function BudgetPerformanceReport() {
  const { budgetGoals, expenses, getCategoryById } = useAppContext();

  const performanceData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Filter for monthly budget goals first
    const monthlyGoals = budgetGoals.filter(goal => goal.period === 'monthly');

    return monthlyGoals.map(goal => {
      const category = getCategoryById(goal.categoryId);
      const spendingThisMonth = expenses
        .filter(expense => {
            if (expense.categoryId !== goal.categoryId) return false;
            try {
                const expenseDate = parseISO(expense.date);
                return isWithinInterval(expenseDate, { start: currentMonthStart, end: currentMonthEnd });
            } catch (e) { return false; }
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

      const difference = goal.amount - spendingThisMonth;
      let status: BudgetPerformanceData['status'] = 'On Track';
      if (spendingThisMonth === 0 && goal.amount > 0) status = 'No Spending';
      else if (difference < 0) status = 'Over Budget';
      else if (difference > 0) status = 'Under Budget';
      
      return {
        category,
        budgetId: goal.id,
        budgetedAmount: goal.amount,
        actualSpending: spendingThisMonth,
        difference,
        status,
      };
    });
  }, [budgetGoals, expenses, getCategoryById]);

  if (budgetGoals.filter(g => g.period === 'monthly').length === 0) {
    return (
      <Card className="mt-6 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Monthly Budget Performance</CardTitle>
          <CardDescription>Compare your budgeted amounts against actual spending for the current month ({format(new Date(), 'MMMM yyyy')}).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center">
          <img src="https://placehold.co/300x180.png" data-ai-hint="table document" alt="No budget data" className="mb-4 rounded-lg opacity-70" />
          <p className="text-muted-foreground text-center">No monthly budget goals set yet. Add some in the Budgets section to see your performance!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Monthly Budget Performance</CardTitle>
        <CardDescription>Compare your budgeted amounts against actual spending for {format(new Date(), 'MMMM yyyy')}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Category</TableHead>
              <TableHead className="text-right">Budgeted</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performanceData.map(item => (
              <TableRow key={item.budgetId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.category && <CategoryIcon category={item.category} size="sm" />}
                    <span className="font-medium">{item.category?.name || 'Uncategorized'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{DEFAULT_CURRENCY}{item.budgetedAmount.toFixed(2)}</TableCell>
                <TableCell className="text-right">{DEFAULT_CURRENCY}{item.actualSpending.toFixed(2)}</TableCell>
                <TableCell className={cn(
                    "text-right font-medium",
                    item.difference < 0 ? "text-destructive" : "text-accent"
                )}>
                  {item.difference < 0 ? '-' : ''}{DEFAULT_CURRENCY}{Math.abs(item.difference).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={
                    item.status === 'Over Budget' ? 'destructive' : 
                    item.status === 'Under Budget' ? 'default' : // Using primary for "Under Budget"
                    item.status === 'No Spending' ? 'secondary' : 'outline' 
                  }
                  className={cn(item.status === 'Under Budget' && "bg-accent text-accent-foreground hover:bg-accent/80")}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption>Budget performance for the current month.</TableCaption>
        </Table>
      </CardContent>
    </Card>
  );
}
