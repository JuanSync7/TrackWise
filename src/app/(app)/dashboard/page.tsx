
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { BudgetGoalPieChart } from '@/components/dashboard/budget-goal-pie-chart';
import { DollarSign, TrendingUp, TrendingDown, ListChecks, Wallet } from 'lucide-react';
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // Changed context
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { useMemo, useState, useEffect } from 'react';
import type { Expense } from '@/lib/types'; // Still use personal Expense type for this dashboard overview
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { expenses, budgetGoals } = usePersonalFinance(); // Changed context
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const totalBudget = useMemo(() => {
    return budgetGoals.reduce((sum, goal) => sum + goal.amount, 0);
  }, [budgetGoals]);

  const remainingBudget = totalBudget - totalExpenses;

  const averageExpense = useMemo(() => {
    return expenses.length > 0 ? totalExpenses / expenses.length : 0;
  }, [expenses, totalExpenses]);


  const [expenseTrend, setExpenseTrend] = useState<{ value: string; icon: any; color: string } | null>(null);

  useEffect(() => {
    if (expenses.length > 1) {
      const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastExpense = sortedExpenses[0];
      const secondLastExpense = sortedExpenses[1];

      if (lastExpense && secondLastExpense) {
        if (lastExpense.amount > secondLastExpense.amount) {
          setExpenseTrend({ value: "Spending up", icon: TrendingUp, color: "text-destructive" });
        } else if (lastExpense.amount < secondLastExpense.amount) {
          setExpenseTrend({ value: "Spending down", icon: TrendingDown, color: "text-accent" });
        } else {
          setExpenseTrend(null);
        }
      } else {
        setExpenseTrend(null);
      }
    } else {
      setExpenseTrend(null);
    }
  }, [expenses]);


  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Welcome to Trackwise!"
        description="Here's your financial overview."
        actions={
          <Link href="/expenses" passHref>
            <Button>
              <ListChecks className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total Expenses"
          value={`${DEFAULT_CURRENCY}${totalExpenses.toFixed(2)}`}
          icon={DollarSign}
          isLoading={isLoading}
          trend={expenseTrend?.value}
          trendColor={expenseTrend?.color as any}
        />
        <SummaryCard
          title="Total Personal Budget"
          value={`${DEFAULT_CURRENCY}${totalBudget.toFixed(2)}`}
          icon={Wallet}
          isLoading={isLoading}
        />
         <SummaryCard
          title="Remaining Personal Budget"
          value={`${DEFAULT_CURRENCY}${remainingBudget.toFixed(2)}`}
          icon={Wallet}
          isLoading={isLoading}
          trendColor={remainingBudget >=0 ? "text-accent" : "text-destructive"}
        />
        <SummaryCard
          title="Average Transaction"
          value={`${DEFAULT_CURRENCY}${averageExpense.toFixed(2)}`}
          icon={ListChecks}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart />
        </div>
        <div className="lg:col-span-1">
          <BudgetGoalPieChart />
        </div>
      </div>
    </div>
  );
}
