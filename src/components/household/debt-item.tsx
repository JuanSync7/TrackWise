
"use client";

import type { Debt } from '@/lib/types';
import { useHousehold } from '@/contexts/household-context'; 
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, User, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface DebtItemProps {
  debt: Debt;
}

const DebtItemComponent = ({ debt }: DebtItemProps) => {
  const { getMemberById, settleDebt, unsettleDebt } = useHousehold(); 
  const { toast } = useToast();
  const [isConfirmingSettlement, setIsConfirmingSettlement] = useState(false);
  const [isConfirmingUnsettlement, setIsConfirmingUnsettlement] = useState(false);

  const owedByMember = getMemberById(debt.owedByMemberId);
  const owedToMember = getMemberById(debt.owedToMemberId);

  if (!owedByMember || !owedToMember) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardContent className="p-4">
          <p className="text-destructive-foreground">Error: Could not load member details for this debt.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSettle = useCallback(() => {
    settleDebt(debt.id);
    toast({ title: "Debt Settled", description: `Debt for "${debt.expenseDescription}" marked as settled.` });
    setIsConfirmingSettlement(false);
  }, [debt.id, debt.expenseDescription, settleDebt, toast]);

  const handleUnsettle = useCallback(() => {
    unsettleDebt(debt.id);
    toast({ title: "Debt Unsettled", description: `Debt for "${debt.expenseDescription}" marked as unsettled.` });
    setIsConfirmingUnsettlement(false);
  }, [debt.id, debt.expenseDescription, unsettleDebt, toast]);

  return (
    <>
      <Card className={`overflow-hidden transition-shadow hover:shadow-md ${debt.isSettled ? 'opacity-60 bg-muted/50' : ''}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-medium truncate" title={debt.expenseDescription}>
            {debt.expenseDescription}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1 text-primary" />
              <span className="font-semibold text-foreground">{owedByMember.name}</span>
              <ArrowRight className="h-4 w-4 mx-1.5 text-muted-foreground" />
              <User className="h-4 w-4 mr-1 text-accent" />
              <span className="font-semibold text-foreground">{owedToMember.name}</span>
            </div>
            <p className={`text-lg font-bold ${debt.isSettled ? 'text-muted-foreground' : 'text-primary'}`}>
              {DEFAULT_CURRENCY}{debt.amount.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created: {format(new Date(debt.createdAt), 'PP')}</span>
            {debt.isSettled ? (
              <Badge variant="secondary" className="flex items-center gap-1 text-green-600 border-green-500">
                <CheckCircle2 className="h-3 w-3" /> Settled {debt.settledAt ? `(${format(new Date(debt.settledAt), 'PP')})` : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-500">
                <XCircle className="h-3 w-3" /> Unsettled
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          {debt.isSettled ? (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setIsConfirmingUnsettlement(true)}>
              Mark as Unsettled
            </Button>
          ) : (
            <Button variant="default" size="sm" className="w-full" onClick={() => setIsConfirmingSettlement(true)}>
              Mark as Settled
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmingSettlement} onOpenChange={setIsConfirmingSettlement}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settle Debt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this debt of {DEFAULT_CURRENCY}{debt.amount.toFixed(2)} from {owedByMember.name} to {owedToMember.name} for "{debt.expenseDescription}" as settled?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettle}>Settle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmingUnsettlement} onOpenChange={setIsConfirmingUnsettlement}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsettle Debt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this debt of {DEFAULT_CURRENCY}{debt.amount.toFixed(2)} from {owedByMember.name} to {owedToMember.name} for "{debt.expenseDescription}" as unsettled?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsettle} className="bg-destructive hover:bg-destructive/90">Unsettle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const DebtItem = React.memo(DebtItemComponent);
