
"use client";

import React, { useState, useMemo, Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useHousehold } from '@/contexts/household-context';
// import { DebtList } from '@/components/household/debt-list'; // Lazy load
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Debt, Member } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { ArrowDownCircle, ArrowUpCircle, Users, DivideSquare, Scale, Loader2 } from 'lucide-react';

const DebtList = React.lazy(() => import('@/components/household/debt-list').then(module => ({ default: module.DebtList })));

export default function ExpenseSplittingPage() {
  const { getAllDebts, getMemberById, members, getDebtsOwedByMember, getDebtsOwedToMember } = useHousehold();
  const { user } = useAuth();

  const currentUserMember = useMemo(() => {
    if (!user || !members || members.length === 0) return null;
    return members.find(m =>
      (user.displayName && m.name.toLowerCase().includes(user.displayName.toLowerCase())) ||
      (user.email && m.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase()))
    );
  }, [user, members]);


  const allDebtsForDisplay = getAllDebts(true);

  const unsettledDebtsOwedByCurrentUser = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedByMember(currentUserMember.id, false);
  }, [currentUserMember, getDebtsOwedByMember]);

  const unsettledDebtsOwedToCurrentUser = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedToMember(currentUserMember.id, false);
  }, [currentUserMember, getDebtsOwedToMember]);

  const totalOwedByCurrentUser = unsettledDebtsOwedByCurrentUser.reduce((sum, debt) => sum + debt.amount, 0);
  const totalOwedToCurrentUser = unsettledDebtsOwedToCurrentUser.reduce((sum, debt) => sum + debt.amount, 0);
  const netBalance = totalOwedToCurrentUser - totalOwedByCurrentUser;

  const debtsOwedByCurrentUserForList = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedByMember(currentUserMember.id, true);
  }, [currentUserMember, getDebtsOwedByMember]);

  const debtsOwedToCurrentUserForList = useMemo(() => {
    if (!currentUserMember) return [];
    return getDebtsOwedToMember(currentUserMember.id, true);
  }, [currentUserMember, getDebtsOwedToMember]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Expense Splitting & Debts"
        description="Manage and track shared expenses and who owes whom within the household. Settled debts are shown for record-keeping."
      />

      {currentUserMember && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You Owe (Unsettled)</CardTitle>
              <ArrowDownCircle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{DEFAULT_CURRENCY}{totalOwedByCurrentUser.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total amount you currently owe to others.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You Are Owed (Unsettled)</CardTitle>
              <ArrowUpCircle className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{DEFAULT_CURRENCY}{totalOwedToCurrentUser.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Total amount others currently owe you.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance (Unsettled)</CardTitle>
              <Scale className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {netBalance >= 0 ? '+' : '-'}{DEFAULT_CURRENCY}{Math.abs(netBalance).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {netBalance >= 0 ? "You are net owed this amount." : "You net owe this amount."} (Based on unsettled debts)
              </p>
            </CardContent>
          </Card>
        </div>
      )}
       {!currentUserMember && members.length > 0 && user && (
        <Card className="mb-6 bg-secondary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground"/> Personalized View Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">To see your personalized debt summary ("You Owe", "You are Owed"), ensure your user display name (e.g., "{user?.displayName || 'Mock User'}") or part of your email (e.g., "{user?.email?.split('@')[0] || 'user'}") matches a household member's name. Currently, we couldn't find a direct match.</p>
            <p className="text-xs text-muted-foreground mt-2">Available household members: {members.map(m => m.name).join(', ')}.</p>
          </CardContent>
        </Card>
      )}


      <Tabs defaultValue="all_debts" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-4">
          <TabsTrigger value="all_debts" className="flex items-center gap-1"><DivideSquare className="h-4 w-4"/>All Debts</TabsTrigger>
          {currentUserMember && <TabsTrigger value="owed_by_me" className="flex items-center gap-1"><ArrowDownCircle className="h-4 w-4"/>I Owe</TabsTrigger>}
          {currentUserMember && <TabsTrigger value="owed_to_me" className="flex items-center gap-1"><ArrowUpCircle className="h-4 w-4"/>Owed To Me</TabsTrigger>}
        </TabsList>
        <TabsContent value="all_debts">
          <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <DebtList
              debts={allDebtsForDisplay}
              title="All Household Debts"
              emptyStateMessage="No debts in the household. Great job staying on top of things!"
              emptyStateImageHint="agreement handshake"
            />
          </Suspense>
        </TabsContent>
        {currentUserMember && (
            <>
                <TabsContent value="owed_by_me">
                  <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <DebtList
                        debts={debtsOwedByCurrentUserForList}
                        title={`Debts You Owe (${currentUserMember.name})`}
                        emptyStateMessage="You currently don't owe anyone anything. Nice!"
                        emptyStateImageHint="empty wallet"
                    />
                  </Suspense>
                </TabsContent>
                <TabsContent value="owed_to_me">
                  <Suspense fallback={<div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <DebtList
                        debts={debtsOwedToCurrentUserForList}
                        title={`Debts Owed To You (${currentUserMember.name})`}
                        emptyStateMessage="No one currently owes you anything."
                        emptyStateImageHint="money bag"
                    />
                  </Suspense>
                </TabsContent>
            </>
        )}
      </Tabs>
    </div>
  );
}
