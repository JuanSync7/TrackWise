
import { POT_PAYER_ID } from '@/lib/constants';

export interface MemberInput {
  id: string;
  directCashContribution: number;
}

export interface ExpenseInput {
  amount: number;
  isSplit: boolean;
  splitWithTripMemberIds: string[]; // Changed from splitWithMemberIds for clarity in this context
  paidByMemberId?: string;
}

export interface CalculatedMemberFinancials {
  memberId: string;
  directCashContribution: number;
  amountPersonallyPaidForGroup: number;
  totalShareOfAllGroupExpenses: number;
  finalNetShareForSettlement: number;
}

// This is the raw output from the settlement algorithm
export interface RawSettlement {
  owedByMemberId: string;
  owedToTripMemberId: string; // Standardized to match TripSettlement type
  amount: number;
}

const EPSILON = 0.005; // For floating point comparisons

/**
 * Calculates the comprehensive financial position for each member.
 * This considers direct cash contributions, personal payments for group items,
 * and their share of all expenses (whether pot-paid or member-paid).
 */
export function calculateNetFinancialPositions(
  memberInputs: MemberInput[],
  allGroupExpenses: ExpenseInput[],
  allMemberIdsInGroup: string[]
): Map<string, CalculatedMemberFinancials> {
  const results = new Map<string, CalculatedMemberFinancials>();

  // Initialize results for all members
  allMemberIdsInGroup.forEach(memberId => {
    const memberInput = memberInputs.find(m => m.id === memberId);
    results.set(memberId, {
      memberId: memberId,
      directCashContribution: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)),
      amountPersonallyPaidForGroup: 0,
      totalShareOfAllGroupExpenses: 0,
      // Start with cash contribution as the initial net position.
      // Personal payments will add to this, and share of expenses will subtract.
      finalNetShareForSettlement: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)),
    });
  });

  allGroupExpenses.forEach(expense => {
    let membersSharingThisExpense: string[] = [];
    // Ensure only existing members from the current group are part of the split
    if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
      membersSharingThisExpense = expense.splitWithTripMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else { // If not explicitly split, or splitWith is empty, it's shared among all members in the group
      membersSharingThisExpense = [...allMemberIdsInGroup];
    }

    // Avoid division by zero if no members are sharing (e.g., if all split members were deleted)
    const numSharing = membersSharingThisExpense.length > 0 ? membersSharingThisExpense.length : 1;
    const individualShareOfThisExpense = parseFloat((expense.amount / numSharing).toFixed(2));

    // If an individual member paid (not the Pot), credit their netShare and track amountPersonallyPaidForGroup
    if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
      const payerResult = results.get(expense.paidByMemberId);
      if (payerResult) {
        // This member fronted the money, so their "effective contribution" increases
        payerResult.finalNetShareForSettlement += expense.amount;
        payerResult.amountPersonallyPaidForGroup += expense.amount;
        payerResult.amountPersonallyPaidForGroup = parseFloat(payerResult.amountPersonallyPaidForGroup.toFixed(2));
      }
    }
    // If POT_PAYER_ID paid, the cash for the expense is considered to have come from the sum of directCashContributions.
    // The finalNetShareForSettlement is debited below for each sharer.

    // Debit each sharing member for their share of this expense
    membersSharingThisExpense.forEach(memberIdInSplit => {
      const memberResult = results.get(memberIdInSplit);
      if (memberResult) {
        memberResult.finalNetShareForSettlement -= individualShareOfThisExpense;
        memberResult.totalShareOfAllGroupExpenses += individualShareOfThisExpense;
        memberResult.totalShareOfAllGroupExpenses = parseFloat(memberResult.totalShareOfAllGroupExpenses.toFixed(2));
      }
    });
  });

  // Final rounding for the primary settlement value
  results.forEach(res => {
    res.finalNetShareForSettlement = parseFloat(res.finalNetShareForSettlement.toFixed(2));
  });

  return results;
}


/**
 * Generates a list of settlements (who owes whom) based on final net financial positions.
 */
export function generateSettlements(calculatedFinancialsArray: CalculatedMemberFinancials[]): RawSettlement[] {
  const settlements: RawSettlement[] = [];
  if (calculatedFinancialsArray.length < 2) {
    return settlements;
  }

  let debtors = calculatedFinancialsArray
    .filter(m => m.finalNetShareForSettlement < -EPSILON) // Member owes money
    .map(m => ({ id: m.memberId, amount: parseFloat(Math.abs(m.finalNetShareForSettlement).toFixed(2)) }));

  let creditors = calculatedFinancialsArray
    .filter(m => m.finalNetShareForSettlement > EPSILON) // Member is owed money
    .map(m => ({ id: m.memberId, amount: parseFloat(m.finalNetShareForSettlement.toFixed(2)) }));

  // Sort for potentially more optimal/consistent settlement order
  debtors.sort((a, b) => b.amount - a.amount); 
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToTransfer = parseFloat(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (amountToTransfer > EPSILON) {
      settlements.push({
        owedByMemberId: debtor.id,
        owedToTripMemberId: creditor.id, // Using standardized key
        amount: amountToTransfer,
      });

      debtor.amount = parseFloat((debtor.amount - amountToTransfer).toFixed(2));
      creditor.amount = parseFloat((creditor.amount - amountToTransfer).toFixed(2));
    }

    if (debtor.amount < EPSILON) {
      dIdx++;
    }

    if (creditor.amount < EPSILON) {
      cIdx++;
    }
  }
  return settlements;
}
