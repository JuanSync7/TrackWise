
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, TableIcon } from 'lucide-react';
import { MonthlySpendingTrendChart } from '@/components/reports/monthly-spending-trend-chart';
import { BudgetPerformanceReport } from '@/components/reports/budget-performance-report';
// No context needed directly in this page, child components will use their respective contexts

export default function ReportsPage() {
  return (
    <div className="container mx-auto">
      <PageHeader
        title="Financial Reports"
        description="Analyze your spending habits and financial health over time."
      />
      <Tabs defaultValue="spending_trends" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 md:max-w-md">
          <TabsTrigger value="spending_trends" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" /> Spending Trends
          </TabsTrigger>
          <TabsTrigger value="budget_performance" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" /> Budget Performance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="spending_trends">
          <MonthlySpendingTrendChart />
        </TabsContent>
        <TabsContent value="budget_performance">
          <BudgetPerformanceReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
