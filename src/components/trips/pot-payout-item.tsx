
"use client";

import { DEFAULT_CURRENCY } from '@/lib/constants';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wallet } from 'lucide-react';

interface PotPayoutItemProps {
  payout: {
    tripMemberId: string;
    memberName: string;
    amount: number;
  };
}

const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names.map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export function PotPayoutItem({ payout }: PotPayoutItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-accent/10 hover:bg-accent/20 transition-colors text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-accent" />
        <span className="font-medium text-accent-foreground">Pot Pays</span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6 text-xs">
          <AvatarFallback>{getInitials(payout.memberName)}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-accent-foreground">{payout.memberName}</span>
      </div>
      <span className="font-semibold text-accent">
        {DEFAULT_CURRENCY}{payout.amount.toFixed(2)}
      </span>
    </div>
  );
}
