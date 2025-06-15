
"use client";

import React, { useMemo } from 'react';
import type { TripMember, MemberDisplayFinancials } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign, Scale, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTrips } from '@/contexts/trip-context'; // Changed context
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TripMemberItemProps {
  tripMember: TripMember;
  onDelete: (tripMemberId: string) => void;
  onAddContribution: (tripMemberId: string) => void;
  // numberOfTripMembers prop is no longer strictly needed here as financial calculations are centralized
}

const defaultFinancials: MemberDisplayFinancials = {
  directCashContribution: 0,
  amountPersonallyPaidForGroup: 0,
  totalShareOfAllGroupExpenses: 0,
  netOverallPosition: 0,
};

const TripMemberItemComponent = ({
  tripMember,
  onDelete,
  onAddContribution,
}: TripMemberItemProps) => {
  const { getTripMemberNetData } = useTrips(); // Changed context

  const calculatedNetData: MemberDisplayFinancials = useMemo(() => {
    const data = getTripMemberNetData(tripMember.tripId, tripMember.id);
    // Ensure all properties are present, even if 0, to prevent toFixed errors
    return {
        directCashContribution: data?.directCashContribution || 0,
        amountPersonallyPaidForGroup: data?.amountPersonallyPaidForGroup || 0,
        totalShareOfAllGroupExpenses: data?.totalShareOfAllGroupExpenses || 0,
        netOverallPosition: data?.netOverallPosition || 0,
    };
  }, [tripMember.id, tripMember.tripId, getTripMemberNetData]);


  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <User className="h-10 w-10 text-primary p-1.5 bg-primary/10 rounded-full" />
          <div>
            <CardTitle className="text-lg">{tripMember.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Landmark className="h-3 w-3 text-teal-500"/> Cash to Pot: {DEFAULT_CURRENCY}{calculatedNetData.directCashContribution.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-accent"/> Paid for Group (Personal): {DEFAULT_CURRENCY}{calculatedNetData.amountPersonallyPaidForGroup.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                 <TrendingDown className="h-3 w-3 text-destructive"/> Share of All Expenses: {DEFAULT_CURRENCY}{calculatedNetData.totalShareOfAllGroupExpenses.toFixed(2)}
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
      <CardContent className="p-4 pt-1">
        <div className="flex items-center gap-2">
          <Scale className={cn("h-5 w-5", calculatedNetData.netOverallPosition >=0 ? "text-accent" : "text-destructive")} />
          <div>
            <p className="text-sm font-medium">Net Position:</p>
            <p className={cn("text-xl font-bold", calculatedNetData.netOverallPosition >=0 ? "text-accent" : "text-destructive")}>
                {DEFAULT_CURRENCY}{calculatedNetData.netOverallPosition.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Overall financial standing considering all contributions and expense shares.
        </p>
      </CardContent>
    </Card>
  );
};

export const TripMemberItem = React.memo(TripMemberItemComponent);
