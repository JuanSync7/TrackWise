
"use client";

import type { TripSettlement } from '@/lib/types';
import { TripSettlementItem } from './trip-settlement-item';
import { HandCoins, Scale } from 'lucide-react'; // Changed icon

interface TripSettlementListProps {
  settlements: TripSettlement[];
  tripId: string;
}

export function TripSettlementList({ settlements, tripId }: TripSettlementListProps) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
        <Scale className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-md font-semibold text-muted-foreground">All Square!</h3>
        <p className="text-sm text-muted-foreground">No outstanding balances among trip members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((settlement) => (
        <TripSettlementItem key={settlement.id} settlement={settlement} />
      ))}
    </div>
  );
}
