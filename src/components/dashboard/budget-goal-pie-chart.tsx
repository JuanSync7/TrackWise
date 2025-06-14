
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { useMemo } from 'react';
import type { Category, BudgetGoal } from '@/lib/types';

interface PieChartDataItem {
  name: string;
  value: number;
  fill: string;
}

export function BudgetGoalPieChart() {
  const { budgetGoals, getCategoryById } = useAppContext();

  const pieData: PieChartDataItem[] = useMemo(() => {
    return budgetGoals.map(goal => {
      const category = getCategoryById(goal.categoryId);
      return {
        name: category?.name || 'Uncategorized',
        value: goal.amount,
        fill: category?.color || '#8884d8', // Fallback color
      };
    }).filter(item => item.value > 0); // Only include goals with a budget amount
  }, [budgetGoals, getCategoryById]);

  if (budgetGoals.length === 0 || pieData.length === 0) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Budget Allocations</CardTitle>
          <CardDescription>Your budget goal allocations will appear here as a pie chart.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] md:h-[350px]">
          <p className="text-muted-foreground text-center">No budget goals set yet. Go to Budgets to add some!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Budget Allocations</CardTitle>
        <CardDescription>How your total budget is distributed across categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + (radius + 15) * Math.cos(-midAngle * RADIAN);
                const y = cy + (radius + 15) * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                    {`${name} (${(percent * 100).toFixed(0)}%)`}
                  </text>
                );
              }}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${DEFAULT_CURRENCY}${value.toFixed(2)}`, name]}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}
            />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
