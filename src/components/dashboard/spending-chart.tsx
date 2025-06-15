
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { useMemo } from 'react';

interface SpendingChartProps {}

interface ChartData {
  name: string;
  total: number;
  fill: string;
}

export function SpendingChart() {
  const { transactions, categories } = usePersonalFinance();

  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.transactionType === 'expense');
  }, [transactions]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    expenseTransactions.forEach(transaction => {
      const category = categories.find(c => c.id === transaction.categoryId);
      if (category) {
        dataMap.set(category.name, (dataMap.get(category.name) || 0) + transaction.amount);
      }
    });

    return Array.from(dataMap.entries()).map(([name, total]) => ({
      name,
      total,
      fill: categories.find(c => c.name === name)?.color || '#8884d8',
    }));
  }, [expenseTransactions, categories]);


  if (expenseTransactions.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
          <CardDescription>Your expenses by category will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No expense data yet. Add some expenses to see your spending chart!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Expense Overview</CardTitle>
        <CardDescription>Total expenses by category this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${DEFAULT_CURRENCY}${value}`} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={100}
              tick={{ dy: 2 }}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => [`${DEFAULT_CURRENCY}${value.toFixed(2)}`, "Total Spent"]}
            />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            <Bar dataKey="total" name="Total Spent" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

    