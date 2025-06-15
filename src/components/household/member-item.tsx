
"use client";

import type { Member, HouseholdMemberNetData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';

interface MemberItemProps {
  member: Member;
  onDelete: (memberId: string) => void;
  onAddContribution: (memberId: string) => void;
}

export function MemberItem({
  member,
  onDelete,
  onAddContribution,
}: MemberItemProps) {
  const { getHouseholdMemberNetPotData, contributions, expenses, sharedBudgets } = useAppContext();
  const [memberNetPotDataState, setMemberNetPotDataState] = useState<HouseholdMemberNetData>({
    directContributionToPot: 0,
    shareOfPotExpenses: 0,
    netPotShare: 0,
  });

  const calculatedNetData = useMemo(() => {
    return getHouseholdMemberNetPotData(member.id);
  }, [member.id, getHouseholdMemberNetPotData, contributions, expenses, sharedBudgets]);

  useEffect(() => {
    setMemberNetPotDataState(calculatedNetData);
  }, [calculatedNetData]);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <User className="h-10 w-10 text-primary p-1.5 bg-primary/10 rounded-full" />
          <div>
            <CardTitle className="text-lg">{member.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-accent"/> Directly Contributed: {DEFAULT_CURRENCY}{memberNetPotDataState.directContributionToPot.toFixed(2)}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                 <TrendingDown className="h-3 w-3 text-destructive"/> Share of Pot Expenses: {DEFAULT_CURRENCY}{memberNetPotDataState.shareOfPotExpenses.toFixed(2)}
            </CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Member options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddContribution(member.id)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Add Contribution
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(member.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2">
          <Scale className={cn("h-5 w-5", memberNetPotDataState.netPotShare >=0 ? "text-accent" : "text-destructive")} />
          <div>
            <p className="text-sm font-medium">Net Share in Pot:</p>
            <p className={cn("text-xl font-bold", memberNetPotDataState.netPotShare >=0 ? "text-accent" : "text-destructive")}>
                {DEFAULT_CURRENCY}{memberNetPotDataState.netPotShare.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Their financial position relative to the household pot.
        </p>
      </CardContent>
    </Card>
  );
}
