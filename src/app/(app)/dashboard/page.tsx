
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { BudgetGoalPieChart } from '@/components/dashboard/budget-goal-pie-chart';
import { DollarSign, TrendingUp, TrendingDown, ListChecks, Wallet, Landmark, MinusCircle, PlusCircle, Scale } from 'lucide-react'; // Added new icons
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { useMemo, useState, useEffect } from 'react';
import type { Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { transactions, budgetGoals } = usePersonalFinance();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalExpenses = useMemo(() => {
    return transactions.filter(t => t.transactionType === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [transactions]);

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.transactionType === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [transactions]);

  const netFlow = totalIncome - totalExpenses;

  const totalBudget = useMemo(() => {
    return budgetGoals.reduce((sum, goal) => sum + goal.amount, 0);
  }, [budgetGoals]);

  const remainingBudget = totalBudget - totalExpenses; // Budget vs Expenses

  const averageExpense = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.transactionType === 'expense');
    return expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0;
  }, [transactions, totalExpenses]);


  const [expenseTrend, setExpenseTrend] = useState<{ value: string; icon: any; color: string } | null>(null);

  useEffect(() => {
    const expenseTransactions = transactions.filter(t => t.transactionType === 'expense');
    if (expenseTransactions.length > 1) {
      const sortedExpenses = [...expenseTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  }, [transactions]);


  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title="Welcome to Trackwise!"
        description="Here's your financial overview."
        actions={
          <Link href="/transactions" passHref>
            <Button>
              <ListChecks className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard
          title="Total Income"
          value={`${DEFAULT_CURRENCY}${totalIncome.toFixed(2)}`}
          icon={PlusCircle}
          isLoading={isLoading}
          trendColor="text-accent"
        />
        <SummaryCard
          title="Total Expenses"
          value={`${DEFAULT_CURRENCY}${totalExpenses.toFixed(2)}`}
          icon={MinusCircle}
          isLoading={isLoading}
          trend={expenseTrend?.value}
          trendColor={expenseTrend?.color as any}
        />
        <SummaryCard
          title="Net Flow"
          value={`${netFlow >= 0 ? '+' : '-'}${DEFAULT_CURRENCY}${Math.abs(netFlow).toFixed(2)}`}
          icon={Scale}
          isLoading={isLoading}
          trendColor={netFlow >=0 ? "text-accent" : "text-destructive"}
        />
        <SummaryCard
          title="Total Personal Budget"
          value={`${DEFAULT_CURRENCY}${totalBudget.toFixed(2)}`}
          icon={Wallet}
          isLoading={isLoading}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <SummaryCard
          title="Remaining Personal Budget"
          value={`${DEFAULT_CURRENCY}${remainingBudget.toFixed(2)}`}
          icon={Landmark} // Changed icon
          isLoading={isLoading}
          trendColor={remainingBudget >=0 ? "text-accent" : "text-destructive"}
        />
        <SummaryCard
          title="Average Expense"
          value={`${DEFAULT_CURRENCY}${averageExpense.toFixed(2)}`}
          icon={ListChecks} // Kept icon
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

    