
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Expense, Category } from '@/lib/types';
import { usePersonalFinance } from '@/contexts/personal-finance-context'; // Changed context
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { useMemo } from 'react';

interface SpendingChartProps {
  // Props are no longer needed as context is used directly
}

interface ChartData {
  name: string;
  total: number; // Keep 'total' for the Bar dataKey
  fill: string;
}

export function SpendingChart() {
  const { expenses, categories } = usePersonalFinance(); // Changed context

  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    expenses.forEach(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      if (category) {
        dataMap.set(category.name, (dataMap.get(category.name) || 0) + expense.amount);
      }
    });

    return Array.from(dataMap.entries()).map(([name, total]) => ({
      name,
      total,
      fill: categories.find(c => c.name === name)?.color || '#8884d8',
    }));
  }, [expenses, categories]);


  if (expenses.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>Your spending by category will appear here.</CardDescription>
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
        <CardTitle>Spending Overview</CardTitle>
        <CardDescription>Total spending by category this month.</CardDescription>
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
