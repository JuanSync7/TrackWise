
"use client";

import type { TripSettlement } from '@/lib/types';
import { useTrips } from '@/contexts/trip-context'; // Changed context
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { ArrowRight, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage

interface TripSettlementItemProps {
  settlement: TripSettlement;
}

export function TripSettlementItem({ settlement }: TripSettlementItemProps) {
  const { getTripMemberById } = useTrips(); // Changed context

  const owedByMember = getTripMemberById(settlement.owedByTripMemberId);
  const owedToMember = getTripMemberById(settlement.owedToTripMemberId);

  if (!owedByMember || !owedToMember) {
    return (
        <div className="flex items-center justify-between p-3 rounded-md border bg-destructive/10 text-destructive text-sm">
             <User className="h-4 w-4 mr-2 text-destructive-foreground" />
            <span>Settlement involves a deleted member.</span>
        </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
