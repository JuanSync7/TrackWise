
"use client";

import { useMemo, useState } from 'react';
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';

type PeriodOption = "last_6_months" | "last_12_months" | "this_year";

interface MonthlyData {
  month: string;
  totalSpending: number;
}

export function MonthlySpendingTrendChart() {
  const { transactions } = usePersonalFinance();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("last_6_months");

  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.transactionType === 'expense');
  }, [transactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfMonth(now);

    switch (selectedPeriod) {
      case "last_12_months":
        startDate = startOfMonth(subMonths(now, 11));
        break;
      case "this_year":
        startDate = startOfMonth(new Date(now.getFullYear(), 0, 1));
        break;
      case "last_6_months":
      default:
        startDate = startOfMonth(subMonths(now, 5));
        break;
    }

    const monthsInPeriod = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyTotals = monthsInPeriod.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const spendingThisMonth = expenseTransactions
        .filter(transaction => {
            try {
                const transactionDate = parseISO(transaction.date);
                return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
            } catch (e) { return false; }
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        month: format(monthDate, 'MMM yyyy'),
        totalSpending: spendingThisMonth,
      };
    });

    return monthlyTotals;
  }, [expenseTransactions, selectedPeriod]);

  if (expenseTransactions.length === 0) {
    return (
      <Card className="mt-6 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Monthly Expense Trends</CardTitle>
          <CardDescription>View your total expenses over selected periods.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex flex-col items-center justify-center">
           <img src="https://placehold.co/300x180.png" data-ai-hint="chart graph" alt="No expense data" className="mb-4 rounded-lg opacity-70" />
          <p className="text-muted-foreground text-center">No expenses recorded yet. Add some expenses to see your spending trends!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle>Monthly Expense Trends</CardTitle>
                <CardDescription>View your total expenses over selected periods.</CardDescription>
            </div>
            <Select value={selectedPeriod} onValueChange={(value: PeriodOption) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                    <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${DEFAULT_CURRENCY}${value}`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => [`${DEFAULT_CURRENCY}${value.toFixed(2)}`, "Total Expenses"]}
            />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            <Line type="monotone" dataKey="totalSpending" name="Total Expenses" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

    