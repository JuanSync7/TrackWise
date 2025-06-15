
"use client";

import type { Member } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Added CardDescription, Header, Title
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface MemberItemProps {
  member: Member;
  onDelete: (memberId: string) => void;
  onAddContribution: (memberId: string) => void;
  totalHouseholdContributions: number;
  remainingHouseholdPot: number;
  numberOfHouseholdMembers: number; 
}

export function MemberItem({
  member,
  onDelete,
  onAddContribution,
  totalHouseholdContributions,
  remainingHouseholdPot,
  numberOfHouseholdMembers
}: MemberItemProps) {
  const { getMemberTotalContribution } = useAppContext();
  const directContribution = getMemberTotalContribution(member.id);

  let memberShareOfPot: number;

  if (remainingHouseholdPot < 0) {
    // If the pot is negative, the deficit is shared equally among all current members.
    if (numberOfHouseholdMembers > 0) {
      memberShareOfPot = remainingHouseholdPot / numberOfHouseholdMembers;
    } else {
      memberShareOfPot = 0; // Should ideally not happen if a member exists
    }
  } else { // Pot is zero or positive
    if (totalHouseholdContributions > 0) {
      // Distribute positive pot proportionally to contributions
      memberShareOfPot = (directContribution / totalHouseholdContributions) * remainingHouseholdPot;
    } else {
      // Pot is zero (or positive but no contributions, which is rare)
      memberShareOfPot = 0;
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <User className="h-10 w-10 text-primary p-1.5 bg-primary/10 rounded-full" />
          <div>
            <CardTitle className="text-lg">{member.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Directly Contributed: {DEFAULT_CURRENCY}{directContribution.toFixed(2)}
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
          <Scale className={cn("h-5 w-5", memberShareOfPot >=0 ? "text-accent" : "text-destructive")} />
          <div>
            <p className="text-sm font-medium">Net Share in Pot:</p>
            <p className={cn("text-xl font-bold", memberShareOfPot >=0 ? "text-accent" : "text-destructive")}>
                {DEFAULT_CURRENCY}{memberShareOfPot.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This is their pro-rata share of the current household pot balance.
        </p>
      </CardContent>
    </Card>
  );
}
