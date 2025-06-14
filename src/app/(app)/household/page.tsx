"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function HouseholdPage() {
  return (
    <div className="container mx-auto">
      <PageHeader
        title="Household Management"
        description="Manage members of your household, track contributions, and shared expenses."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Manage Household Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <img src="https://placehold.co/400x250.png" alt="Coming soon" data-ai-hint="team family" className="mb-6 rounded-lg opacity-70" />
            <p className="text-xl font-semibold text-muted-foreground">
              Member management functionality is coming soon.
            </p>
            <p className="text-muted-foreground mt-2">
              You'll soon be able to add, view, and manage household members here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
