
"use client";

import type { TripMember, TripMemberNetData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign, Scale } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';

interface TripMemberItemProps {
  tripMember: TripMember;
  onDelete: (tripMemberId: string) => void;
  onAddContribution: (tripMemberId: string) => void;
}

export function TripMemberItem({
  tripMember,
  onDelete,
  onAddContribution,
}: TripMemberItemProps) {
  const { getTripMemberNetData, tripContributions, tripExpenses } = useAppContext();
  const [memberNetDataState, setMemberNetDataState] = useState<TripMemberNetData>({
    directContribution: 0,
    shareOfExpenses: 0,
    netShare: 0,
  });

  const calculatedNetData = useMemo(() => {
    if (tripMember && tripMember.tripId && tripMember.id) {
      return getTripMemberNetData(tripMember.tripId, tripMember.id);
    }
    return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };
  }, [tripMember.id, tripMember.tripId, getTripMemberNetData, tripContributions, tripExpenses]); // tripMember.id and tripMember.tripId are primitive and stable

  useEffect(() => {
    setMemberNetDataState(calculatedNetData);
  }, [calculatedNetData]);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <User className="h-10 w-10 text-primary p-1.5 bg-primary/10 rounded-full" />
          <div>
            <CardTitle className="text-lg">{tripMember.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Directly Contributed: {DEFAULT_CURRENCY}{memberNetDataState.directContribution.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground">
              Share of Expenses: {DEFAULT_CURRENCY}{memberNetDataState.shareOfExpenses.toFixed(2)}
            </CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Trip member options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddContribution(tripMember.id)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Add Trip Contribution
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
          <Scale className={cn("h-5 w-5", memberNetDataState.netShare >=0 ? "text-accent" : "text-destructive")} />
          <div>
            <p className="text-sm font-medium">Net Share in Trip:</p>
            <p className={cn("text-xl font-bold", memberNetDataState.netShare >=0 ? "text-accent" : "text-destructive")}>
                {DEFAULT_CURRENCY}{memberNetDataState.netShare.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Contributions minus their share of expenses.
        </p>
      </CardContent>
    </Card>
  );
}
