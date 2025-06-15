
"use client";

import type { TripMember } from '@/lib/types';
import { TripMemberItem } from './trip-member-item';
import { AnimatePresence, motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface TripMemberListProps {
  tripMembers: TripMember[];
  onDeleteTripMember: (tripMemberId: string) => void;
  onAddTripContribution: (tripMemberId: string) => void;
  // numberOfTripMembers prop can be removed if not used, financial calculations are centralized
}

export function TripMemberList({
  tripMembers,
  onDeleteTripMember,
  onAddTripContribution,
}: TripMemberListProps) {
  if (tripMembers.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">No Trip Members Yet</h3>
        <p className="text-muted-foreground">Click "Add New Trip Member" to start building your group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <AnimatePresence initial={false}>
        {tripMembers.map((member) => (
           <motion.div
            key={member.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <TripMemberItem
              tripMember={member}
              onDelete={onDeleteTripMember}
              onAddContribution={onAddTripContribution}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
