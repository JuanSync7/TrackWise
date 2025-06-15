
"use client";

import type { TripSettlement } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { ArrowRight, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // For initials

interface TripSettlementItemProps {
  settlement: TripSettlement;
}

export function TripSettlementItem({ settlement }: TripSettlementItemProps) {
  const { getTripMemberById } = useAppContext();

  const owedByMember = getTripMemberById(settlement.owedByTripMemberId);
  const owedToMember = getTripMemberById(settlement.owedToTripMemberId);

  if (!owedByMember || !owedToMember) {
    return (
      <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
        Error: Could not display settlement due to missing member data.
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 text-xs">
          <AvatarFallback>{getInitials(owedByMember.name)}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{owedByMember.name}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span className="text-sm">owes</span>
      </div>
      <div className="flex items-center gap-2">
         <Avatar className="h-7 w-7 text-xs">
          <AvatarFallback>{getInitials(owedToMember.name)}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{owedToMember.name}</span>
      </div>
      <span className="font-semibold text-primary text-sm">
        {DEFAULT_CURRENCY}{settlement.amount.toFixed(2)}
      </span>
    </div>
  );
}
