
import { POT_PAYER_ID } from '@/lib/constants';

export interface MemberInput {
  id: string;
  directCashContribution: number;
}

export interface ExpenseInput {
  amount: number;
  isSplit: boolean;
  splitWithTripMemberIds: string[]; // Kept name for now for less churn, represents members involved in the split
  paidByMemberId?: string;
  splitType?: 'even' | 'custom';
  customSplitAmounts?: { memberId: string; amount: number }[];
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
 * and their share of all expenses (whether pot-paid or member-paid),
 * respecting custom split amounts if provided.
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
      finalNetShareForSettlement: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)),
    });
  });

  allGroupExpenses.forEach(expense => {
    // If an individual member paid (not the Pot), credit their netShare and track amountPersonallyPaidForGroup
    if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
      const payerResult = results.get(expense.paidByMemberId);
      if (payerResult) {
        payerResult.finalNetShareForSettlement += expense.amount;
        payerResult.amountPersonallyPaidForGroup += expense.amount;
        payerResult.amountPersonallyPaidForGroup = parseFloat(payerResult.amountPersonallyPaidForGroup.toFixed(2));
      }
    }
    // If POT_PAYER_ID paid, the cash for the expense is considered to have come from the sum of directCashContributions.
    // The finalNetShareForSettlement is debited below for each sharer.


    if (expense.isSplit && expense.splitType === 'custom' && expense.customSplitAmounts && expense.customSplitAmounts.length > 0) {
      // Custom Split Logic
      let sumOfCustomSplits = 0;
      expense.customSplitAmounts.forEach(customSplit => {
         sumOfCustomSplits += customSplit.amount;
         const memberResult = results.get(customSplit.memberId);
         if (memberResult && allMemberIdsInGroup.includes(customSplit.memberId)) { // Ensure member is part of the current group
           memberResult.finalNetShareForSettlement -= customSplit.amount;
           memberResult.totalShareOfAllGroupExpenses += customSplit.amount;
           memberResult.totalShareOfAllGroupExpenses = parseFloat(memberResult.totalShareOfAllGroupExpenses.toFixed(2));
         }
      });
      // Validate if sum of custom splits matches total expense amount (within tolerance)
      if (Math.abs(sumOfCustomSplits - expense.amount) > EPSILON) {
        console.warn(`Custom split sum (${sumOfCustomSplits}) for expense amount (${expense.amount}) does not match. Falling back to even split among specified members or all members if custom list is incomplete.`);
        // Fallback to even split if custom split is invalid (e.g., sum doesn't match)
        splitExpenseEvenly(expense, results, allMemberIdsInGroup);
      }
    } else {
      // Even Split Logic (or default if not split explicitly)
      splitExpenseEvenly(expense, results, allMemberIdsInGroup);
    }
  });

  // Final rounding for the primary settlement value
  results.forEach(res => {
    res.finalNetShareForSettlement = parseFloat(res.finalNetShareForSettlement.toFixed(2));
  });

  return results;
}

function splitExpenseEvenly(
    expense: ExpenseInput,
    results: Map<string, CalculatedMemberFinancials>,
    allMemberIdsInGroup: string[]
) {
    let membersSharingThisExpense: string[] = [];
    if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
        membersSharingThisExpense = expense.splitWithTripMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else if (expense.isSplit) { // isSplit is true but no specific members listed, implies all group members
        membersSharingThisExpense = [...allMemberIdsInGroup];
    } else { // Not explicitly split, implies it's for the payer only (if member paid) or shared by all if pot paid.
        if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
            membersSharingThisExpense = [expense.paidByMemberId].filter(id => allMemberIdsInGroup.includes(id));
        } else { // Pot paid, not explicitly split means shared by all
            membersSharingThisExpense = [...allMemberIdsInGroup];
        }
    }

    if (membersSharingThisExpense.length === 0 && allMemberIdsInGroup.length > 0) {
        // If for some reason splitWithMemberIds results in an empty list (e.g. all members were deleted),
        // but the expense was meant to be split, default to splitting among all remaining group members.
        // Or, if it was paid by a specific member who is no longer in the group, this might be an orphaned expense share.
        // For Pot paid expenses, it must be shared by someone if the group isn't empty.
        if (expense.paidByMemberId === POT_PAYER_ID || !expense.paidByMemberId ) {
            membersSharingThisExpense = [...allMemberIdsInGroup];
        } else {
            // If paid by a specific member not in the group, this share is effectively lost or needs manual adjustment.
            // For now, do not assign share to anyone if original split list is empty & not pot paid.
            return;
        }
    }
    
    if (membersSharingThisExpense.length === 0) return; // No one to share with.

    const numSharing = membersSharingThisExpense.length;
    const individualShareOfThisExpense = parseFloat((expense.amount / numSharing).toFixed(2));

    membersSharingThisExpense.forEach(memberIdInSplit => {
        const memberResult = results.get(memberIdInSplit);
        if (memberResult) {
            memberResult.finalNetShareForSettlement -= individualShareOfThisExpense;
            memberResult.totalShareOfAllGroupExpenses += individualShareOfThisExpense;
            memberResult.totalShareOfAllGroupExpenses = parseFloat(memberResult.totalShareOfAllGroupExpenses.toFixed(2));
        }
    });
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

