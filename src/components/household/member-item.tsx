
"use client";

import type { Member } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trash2 } from 'lucide-react';

interface MemberItemProps {
  member: Member;
  onDelete: (memberId: string) => void;
}

export function MemberItem({ member, onDelete }: MemberItemProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          <span className="font-medium">{member.name}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => onDelete(member.id)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete member</span>
        </Button>
      </CardContent>
    </Card>
  );
}
