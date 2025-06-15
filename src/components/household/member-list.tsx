
"use client";

import type { Member } from '@/lib/types';
import { MemberItem } from './member-item';
import { AnimatePresence, motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface MemberListProps {
  members: Member[];
  onDeleteMember: (memberId: string) => void;
  onAddContribution: (memberId: string) => void;
  // numberOfHouseholdMembers prop removed as calculations are centralized
}

export function MemberList({
  members,
  onDeleteMember,
  onAddContribution,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Household Members Yet</h3>
        <p className="text-muted-foreground">Click "Add New Member" to start building your household.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <AnimatePresence initial={false}>
        {members.map((member) => (
           <motion.div
            key={member.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <MemberItem
              member={member}
              onDelete={onDeleteMember}
              onAddContribution={onAddContribution}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
