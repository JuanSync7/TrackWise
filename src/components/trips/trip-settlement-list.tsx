
"use client";

import type { TripSettlement, CalculatedMemberFinancials } from '@/lib/types';
import { TripSettlementItem } from './trip-settlement-item';
import { PotPayoutItem } from './pot-payout-item'; // New component for pot payouts
import { HandCoins, Scale, Wallet } from 'lucide-react'; 
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import React, { useMemo } from 'react';

const EPSILON = 0.005; // For floating point comparisons

interface TripSettlementListProps {
  settlements: TripSettlement[]; // Member-to-member settlements
  tripId: string;
  finalMemberFinancials: Map<string, CalculatedMemberFinancials> | undefined;
  remainingCashInPot: number;
}

export function TripSettlementList({ settlements, tripId, finalMemberFinancials, remainingCashInPot }: TripSettlementListProps) {
  const { getTripMemberById } = useAppContext();

  const potPayouts = useMemo(() => {
    if (!finalMemberFinancials || remainingCashInPot <= EPSILON) {
      return [];
    }

    let undistributedPotCash = remainingCashInPot;
    const payouts: { tripMemberId: string, memberName: string, amount: number }[] = [];

    const membersOwedBySystem = Array.from(finalMemberFinancials.values())
        .filter(fm => fm.finalNetShareForSettlement > EPSILON)
        .sort((a,b) => b.finalNetShareForSettlement - a.finalNetShareForSettlement); // Prioritize larger creditors

    for (const financial of membersOwedBySystem) {
      if (undistributedPotCash <= EPSILON) break;

      const member = getTripMemberById(financial.memberId);
      if (!member) continue;

      const alreadyReceivingFromDebtors = settlements
        .filter(s => s.owedToTripMemberId === financial.memberId)
        .reduce((sum, s) => sum + s.amount, 0);
      
      // Amount this member is still owed by the system after direct debtor payments
      const netOwedBySystemOverall = financial.finalNetShareForSettlement - alreadyReceivingFromDebtors;

      if (netOwedBySystemOverall > EPSILON) {
        const payoutAmount = Math.min(netOwedBySystemOverall, undistributedPotCash);
        if (payoutAmount > EPSILON) {
            payouts.push({
                tripMemberId: member.id,
                memberName: member.name,
                amount: parseFloat(payoutAmount.toFixed(2)),
            });
            undistributedPotCash -= payoutAmount;
        }
      }
    }
    return payouts;
  }, [finalMemberFinancials, settlements, remainingCashInPot, getTripMemberById]);


  const noMemberToMemberSettlements = settlements.length === 0;
  const noPotPayouts = potPayouts.length === 0;

  if (noMemberToMemberSettlements && noPotPayouts) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
        <Scale className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-md font-semibold text-muted-foreground">All Square!</h3>
        <p className="text-sm text-muted-foreground">No outstanding balances or pot distributions needed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member-to-Member Settlements */}
      <div>
        {noMemberToMemberSettlements ? (
          <div className="text-center py-3 border border-dashed border-muted-foreground/20 rounded-md">
             <HandCoins className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No direct member-to-member payments needed.</p>
          </div>
        ) : (
          <>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <HandCoins className="h-4 w-4" /> Member-to-Member Payments:
            </h4>
            <div className="space-y-3">
            {settlements.map((settlement) => (
              <TripSettlementItem key={settlement.id} settlement={settlement} />
            ))}
            </div>
          </>
        )}
      </div>

      {/* Pot Payouts */}
      {remainingCashInPot > EPSILON && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Pot Distribution (Remaining: {DEFAULT_CURRENCY}{remainingCashInPot.toFixed(2)}):
          </h4>
          {noPotPayouts ? (
            <div className="text-center py-3 border border-dashed border-muted-foreground/20 rounded-md">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Pot cash is balanced. No further distribution needed from the pot itself.</p>
                <p className="text-xs text-muted-foreground">(Pot surplus was handled by member-to-member payments or no surplus exists)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {potPayouts.map((payout) => (
                <PotPayoutItem key={payout.tripMemberId} payout={payout} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple component for displaying pot payouts
// This could be a more styled component if needed
const PotPayoutItem = ({ payout }: { payout: { tripMemberId: string, memberName: string, amount: number } }) => (
  <div className="flex items-center justify-between p-3 rounded-md border bg-accent/10 hover:bg-accent/20 transition-colors text-sm">
    <div className="flex items-center gap-2">
      <Wallet className="h-5 w-5 text-accent" />
      <span className="font-medium">Pot Pays</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="font-medium">{payout.memberName}</span>
    </div>
    <span className="font-semibold text-accent">
      {DEFAULT_CURRENCY}{payout.amount.toFixed(2)}
    </span>
  </div>
);
