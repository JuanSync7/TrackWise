
"use client";

import type { Member } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2, MoreVertical, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { DEFAULT_CURRENCY } from '@/lib/constants';

interface MemberItemProps {
  member: Member;
  onDelete: (memberId: string) => void;
  onAddContribution: (memberId: string) => void;
}

export function MemberItem({ member, onDelete, onAddContribution }: MemberItemProps) {
  const { getMemberTotalContribution } = useAppContext();
  const totalContribution = getMemberTotalContribution(member.id);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary p-1 bg-primary/10 rounded-full" />
          <div>
            <span className="font-medium text-lg">{member.name}</span>
            <p className="text-sm text-muted-foreground">
              Contributed: {DEFAULT_CURRENCY}{totalContribution.toFixed(2)}
            </p>
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
      </CardContent>
    </Card>
  );
}
