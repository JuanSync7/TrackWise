
"use client";

import type { TripMember, TripMemberNetData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY, POT_PAYER_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface TripMemberItemProps {
  tripMember: TripMember;
  onDelete: (tripMemberId: string) => void;
  onAddContribution: (tripMemberId: string) => void;
  numberOfTripMembers: number;
}

export function TripMemberItem({
  tripMember,
  onDelete,
  onAddContribution,
  numberOfTripMembers,
}: TripMemberItemProps) {
  const { getTripMemberNetData, tripContributions, tripExpenses, getTripMemberTotalDirectContribution } = useAppContext();

  // This calculates the member's net share in the POT's cash
  const calculatedNetShareInPot: TripMemberNetData = useMemo(() => {
    if (tripMember && tripMember.tripId && tripMember.id) {
      // Use getTripMemberNetData for the "Net Share in Pot" card,
      // which reflects their claim on the pot's cash balance.
      return getTripMemberNetData(tripMember.tripId, tripMember.id);
    }
    return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };
  }, [tripMember.id, tripMember.tripId, getTripMemberNetData, tripContributions, tripExpenses, numberOfTripMembers]);


  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <User className="h-10 w-10 text-primary p-1.5 bg-primary/10 rounded-full" />
          <div>
            <CardTitle className="text-lg">{tripMember.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-accent"/> Directly Contributed to Pot: {DEFAULT_CURRENCY}{calculatedNetShareInPot.directContribution.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                 <TrendingDown className="h-3 w-3 text-destructive"/> Share of Pot-Paid Expenses: {DEFAULT_CURRENCY}{calculatedNetShareInPot.shareOfExpenses.toFixed(2)}
            </CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Trip member options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddContribution(tripMember.id)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Add Cash Contribution
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(tripMember.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Trip Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2">
          <Scale className={cn("h-5 w-5", calculatedNetShareInPot.netShare >=0 ? "text-accent" : "text-destructive")} />
          <div>
            <p className="text-sm font-medium">Net Share in Trip Pot:</p>
            <p className={cn("text-xl font-bold", calculatedNetShareInPot.netShare >=0 ? "text-accent" : "text-destructive")}>
                {DEFAULT_CURRENCY}{calculatedNetShareInPot.netShare.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Their claim on the pot's cash based on direct contributions and share of pot-paid expenses.
        </p>
      </CardContent>
    </Card>
  );
}
