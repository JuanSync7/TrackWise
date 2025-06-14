
"use client";

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useAppContext } from '@/contexts/app-context';
import { DebtList } from '@/components/household/debt-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Debt, Member } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { ArrowDownCircle, ArrowUpCircle, Users } from 'lucide-react';

export default function ExpenseSplittingPage() {
  const { getAllUnsettledDebts, getMemberById, members, getDebtsOwedByMember, getDebtsOwedToMember } = useAppContext();
  const { user } = useAuth(); // Assuming mock user has an email or a way to link to a Member

  // This is a placeholder for linking Firebase user to household member
  // In a real app, you'd have a more robust way to find the current user's Member profile
  const currentUserMember = useMemo(() => {
    if (!user || !user.email) return null;
    // Attempt to find a member by matching the mock user's email or display name
    // This is very basic and might not work if names/emails aren't exact matches
    return members.find(m => m.name.toLowerCase().includes(user.displayName?.toLowerCase() || 'none') || 
                              m.name.toLowerCase().includes(user.email?.split('@')[0].toLowerCase() || 'none'));
  }, [user, members]);


  const allUnsettledDebts = getAllUnsettledDebts();
  
  const debtsOwedByCurrentUser = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedByMember(currentUserMember.id);
  }, [currentUserMember, getDebtsOwedByMember]);

  const debtsOwedToCurrentUser = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedToMember(currentUserMember.id);
  }, [currentUserMember, getDebtsOwedToMember]);

  const totalOwedByCurrentUser = debtsOwedByCurrentUser.reduce((sum, debt) => sum + debt.amount, 0);
  const totalOwedToCurrentUser = debtsOwedToCurrentUser.reduce((sum, debt) => sum + debt.amount, 0);
  const netBalance = totalOwedToCurrentUser - totalOwedByCurrentUser;

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Expense Splitting & Debts"
        description="Manage and track shared expenses and who owes whom within the household."
      />

      {currentUserMember && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You Owe</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{DEFAULT_CURRENCY}{totalOwedByCurrentUser.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total amount you owe to others.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{DEFAULT_CURRENCY}{totalOwedToCurrentUser.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total amount others owe you.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {netBalance >= 0 ? '+' : '-'}{DEFAULT_CURRENCY}{Math.abs(netBalance).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {netBalance >= 0 ? "You are net owed this amount." : "You net owe this amount."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
       {!currentUserMember && members.length > 0 && (
        <Card className="mb-6 bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-lg">Personalized View Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">To see your personalized debt summary ("You Owe", "You are Owed"), ensure your user display name (e.g., "{user?.displayName || 'Mock User'}") or part of your email (e.g., "{user?.email?.split('@')[0] || 'user'}") matches a household member's name. Currently, we couldn't find a direct match.</p>
          </CardContent>
        </Card>
      )}


      <Tabs defaultValue="all_unsettled" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-4">
          <TabsTrigger value="all_unsettled">All Unsettled Debts</TabsTrigger>
          {currentUserMember && <TabsTrigger value="owed_by_me">I Owe</TabsTrigger>}
          {currentUserMember && <TabsTrigger value="owed_to_me">Owed To Me</TabsTrigger>}
        </TabsList>
        <TabsContent value="all_unsettled">
          <DebtList
            debts={allUnsettledDebts}
            title="All Unsettled Household Debts"
            emptyStateMessage="No unsettled debts in the household. Great job staying on top of things!"
            emptyStateImageHint="agreement handshake"
          />
        </TabsContent>
        {currentUserMember && (
            <>
                <TabsContent value="owed_by_me">
                <DebtList
                    debts={debtsOwedByCurrentUser}
                    title={`Debts You Owe (${currentUserMember.name})`}
                    emptyStateMessage="You currently don't owe anyone anything. Nice!"
                    emptyStateImageHint="empty wallet"
                />
                </TabsContent>
                <TabsContent value="owed_to_me">
                <DebtList
                    debts={debtsOwedToCurrentUser}
                    title={`Debts Owed To You (${currentUserMember.name})`}
                    emptyStateMessage="No one currently owes you anything."
                    emptyStateImageHint="money bag"
                />
                </TabsContent>
            </>
        )}
      </Tabs>
    </div>
  );
}
