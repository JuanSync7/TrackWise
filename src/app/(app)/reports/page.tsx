"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="container mx-auto">
      <PageHeader 
        title="Financial Reports"
        description="Analyze your spending habits and financial health over time."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Coming Soon!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <img src="https://placehold.co/400x250.png" alt="Coming soon" data-ai-hint="chart graph" className="mb-6 rounded-lg opacity-70" />
            <p className="text-xl font-semibold text-muted-foreground">
              Detailed financial reports and analytics are under development.
            </p>
            <p className="text-muted-foreground mt-2">
              Stay tuned for powerful insights into your spending patterns, category breakdowns, and progress towards financial goals.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
