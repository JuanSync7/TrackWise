
import { POT_PAYER_ID } from '@/lib/constants';

/**
 * Represents the input data for a member's direct financial contributions.
 */
export interface MemberInput {
  id: string;
  directCashContribution: number; // Cash put into a communal pot or fund
}

/**
 * Represents the input data for a group expense.
 */
export interface ExpenseInput {
  amount: number; // Total amount of the expense
  isSplit: boolean; // Whether the expense is split among members
  splitWithTripMemberIds: string[]; // IDs of members who share this expense (even if paid by one)
  paidByMemberId?: string; // ID of the member who paid, or POT_PAYER_ID if paid from communal funds
  splitType?: 'even' | 'custom'; // How the expense is split
  customSplitAmounts?: { memberId: string; amount: number }[]; // Specific amounts if splitType is 'custom'
}

/**
 * Represents the calculated financial summary for a member within a group context (household or trip).
 */
export interface CalculatedMemberFinancials {
  memberId: string;
  directCashContribution: number;        // Total cash this member put into the pot
  amountPersonallyPaidForGroup: number; // Total amount this member paid from personal funds for group expenses
  totalShareOfAllGroupExpenses: number; // This member's total share of all group expenses (pot-paid or member-paid)
  finalNetShareForSettlement: number;   // Net amount: >0 means system/others owe member; <0 means member owes system/others
}

/**
 * Represents a raw settlement instruction before assigning a unique ID.
 */
export interface RawSettlement {
  owedByMemberId: string;
  owedToTripMemberId: string; // Standardized key from TripSettlement, represents the creditor
  amount: number;
}

const EPSILON = 0.005; // Tolerance for floating-point comparisons

/**
 * Calculates the comprehensive net financial position for each member in a group.
 * This considers direct cash contributions to a pot, personal payments made by members
 * for group expenses, and each member's share of all group expenses.
 * It correctly attributes expense shares based on even splits or custom split amounts.
 *
 * @param memberInputs Array of member contribution data.
 * @param allGroupExpenses Array of all expenses relevant to the group.
 * @param allMemberIdsInGroup Array of all member IDs currently in the group (used for default splits).
 * @returns A Map where keys are member IDs and values are their CalculatedMemberFinancials.
 */
export function calculateNetFinancialPositions(
  memberInputs: MemberInput[],
  allGroupExpenses: ExpenseInput[],
  allMemberIdsInGroup: string[]
): Map<string, CalculatedMemberFinancials> {
  const results = new Map<string, CalculatedMemberFinancials>();

  // Initialize financial data for all members in the group
  allMemberIdsInGroup.forEach(memberId => {
    const memberInput = memberInputs.find(m => m.id === memberId);
    results.set(memberId, {
      memberId: memberId,
      directCashContribution: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)),
      amountPersonallyPaidForGroup: 0,
      totalShareOfAllGroupExpenses: 0,
      // Initial net share is just their cash contribution
      finalNetShareForSettlement: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)),
    });
  });

  // Process each group expense
  allGroupExpenses.forEach(expense => {
    // If an individual member paid this expense (not the Pot):
    // - Increase their 'amountPersonallyPaidForGroup'.
    // - Increase their 'finalNetShareForSettlement' by the expense amount (they are "credited" for paying).
    if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
      const payerResult = results.get(expense.paidByMemberId);
      if (payerResult) {
        payerResult.finalNetShareForSettlement += expense.amount;
        payerResult.amountPersonallyPaidForGroup += expense.amount;
        // Round intermediate sums to avoid floating point issues later
        payerResult.amountPersonallyPaidForGroup = parseFloat(payerResult.amountPersonallyPaidForGroup.toFixed(2));
      }
    }
    // If POT_PAYER_ID paid, the cash for the expense is considered to have come from the sum of directCashContributions.
    // The `finalNetShareForSettlement` for each sharer will be debited below based on their share.

    // Determine how this expense is shared among members
    if (expense.isSplit && expense.splitType === 'custom' && expense.customSplitAmounts && expense.customSplitAmounts.length > 0) {
      let sumOfCustomSplits = 0;
      expense.customSplitAmounts.forEach(customSplit => sumOfCustomSplits += customSplit.amount);

      // Validate custom splits sum against total expense amount (within tolerance)
      if (Math.abs(sumOfCustomSplits - expense.amount) <= EPSILON) {
        expense.customSplitAmounts.forEach(customSplit => {
          const memberResult = results.get(customSplit.memberId);
          // Ensure the member specified in custom split is part of the current group
          if (memberResult && allMemberIdsInGroup.includes(customSplit.memberId)) {
            memberResult.finalNetShareForSettlement -= customSplit.amount; // Debit their share
            memberResult.totalShareOfAllGroupExpenses += customSplit.amount;
            memberResult.totalShareOfAllGroupExpenses = parseFloat(memberResult.totalShareOfAllGroupExpenses.toFixed(2));
          }
        });
      } else {
        console.warn(`Custom split sum (${sumOfCustomSplits.toFixed(2)}) for expense amount (${expense.amount.toFixed(2)}) does not match. Falling back to even split among specified 'splitWithTripMemberIds' or all members.`);
        // Fallback to even split if custom split is invalid
        splitExpenseEvenly(expense, results, allMemberIdsInGroup);
      }
    } else {
      // Even Split Logic (or default behavior if not explicitly split/custom)
      splitExpenseEvenly(expense, results, allMemberIdsInGroup);
    }
  });

  // Final rounding for the primary settlement value to ensure precision
  results.forEach(res => {
    res.finalNetShareForSettlement = parseFloat(res.finalNetShareForSettlement.toFixed(2));
  });

  return results;
}

/**
 * Helper function to distribute an expense evenly among specified or all group members.
 * This is used by `calculateNetFinancialPositions` for even splits or as a fallback.
 *
 * @param expense The expense to split.
 * @param results The current map of member financial summaries to update.
 * @param allMemberIdsInGroup Array of all member IDs currently in the group.
 */
function splitExpenseEvenly(
    expense: ExpenseInput,
    results: Map<string, CalculatedMemberFinancials>,
    allMemberIdsInGroup: string[]
) {
    let membersSharingThisExpense: string[] = [];

    // Determine who shares this expense
    if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
        // Use the explicit list of sharers, filtered by current group members
        membersSharingThisExpense = expense.splitWithTripMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else if (expense.isSplit) {
        // `isSplit` is true but no specific members listed; implies all current group members share
        membersSharingThisExpense = [...allMemberIdsInGroup];
    } else {
        // Expense is not explicitly marked as split.
        // If paid by an individual member, only they "share" it (i.e., it's their personal cost within the group context).
        // If paid by Pot and not split, it's shared by all group members.
        if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
            membersSharingThisExpense = [expense.paidByMemberId].filter(id => allMemberIdsInGroup.includes(id));
        } else { // Pot paid, not explicitly split means shared by all
            membersSharingThisExpense = [...allMemberIdsInGroup];
        }
    }

    // If, after filtering, no valid members are left to share (e.g., all original sharers left the group),
    // and the expense was pot-paid, assign the share to all remaining members.
    // If it was member-paid and that member is gone, the share is effectively orphaned for this calculation.
    if (membersSharingThisExpense.length === 0 && allMemberIdsInGroup.length > 0) {
        if (expense.paidByMemberId === POT_PAYER_ID || !expense.paidByMemberId ) {
            membersSharingThisExpense = [...allMemberIdsInGroup];
        } else {
            return; // Paid by a specific (now absent) member, and no explicit sharers left.
        }
    }
    
    if (membersSharingThisExpense.length === 0) return; // No one to share with.

    const numSharing = membersSharingThisExpense.length;
    const individualShareOfThisExpense = parseFloat((expense.amount / numSharing).toFixed(2)); // Ensure share is rounded

    // Debit each sharing member's net share and update their total expense share
    membersSharingThisExpense.forEach(memberIdInSplit => {
        const memberResult = results.get(memberIdInSplit);
        if (memberResult) {
            memberResult.finalNetShareForSettlement -= individualShareOfThisExpense;
            memberResult.totalShareOfAllGroupExpenses += individualShareOfThisExpense;
            // Round intermediate sums
            memberResult.totalShareOfAllGroupExpenses = parseFloat(memberResult.totalShareOfAllGroupExpenses.toFixed(2));
        }
    });
}


/**
 * Generates a list of raw settlements (who owes whom how much) based on the final
 * net financial positions of members.
 * This algorithm aims to minimize the number of transactions required.
 *
 * @param calculatedFinancialsArray Array of members' calculated financial data.
 * @returns An array of RawSettlement objects.
 */
export function generateSettlements(calculatedFinancialsArray: CalculatedMemberFinancials[]): RawSettlement[] {
  const settlements: RawSettlement[] = [];
  if (calculatedFinancialsArray.length < 2) {
    return settlements; // Not enough members to have settlements
  }

  // Separate members into debtors (owe money) and creditors (are owed money)
  // Amounts are rounded to handle potential floating point inaccuracies from prior calculations.
  let debtors = calculatedFinancialsArray
    .filter(m => parseFloat(m.finalNetShareForSettlement.toFixed(2)) < -EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(Math.abs(m.finalNetShareForSettlement).toFixed(2)) }));

  let creditors = calculatedFinancialsArray
    .filter(m => parseFloat(m.finalNetShareForSettlement.toFixed(2)) > EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(m.finalNetShareForSettlement.toFixed(2)) }));

  // Sort by amount to potentially optimize (largest debts/credits first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0; // Debtor index
  let cIdx = 0; // Creditor index

  // Match debtors with creditors until all debts/credits are settled
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToTransfer = parseFloat(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (amountToTransfer > EPSILON) { // Only create settlement if amount is significant
      settlements.push({
        owedByMemberId: debtor.id,
        owedToTripMemberId: creditor.id, // Using standardized key to match TripSettlement type
        amount: amountToTransfer,
      });

      // Reduce amounts for both debtor and creditor
      debtor.amount = parseFloat((debtor.amount - amountToTransfer).toFixed(2));
      creditor.amount = parseFloat((creditor.amount - amountToTransfer).toFixed(2));
    }

    // Move to next debtor if current one is settled
    if (debtor.amount < EPSILON) {
      dIdx++;
    }

    // Move to next creditor if current one is fully paid
    if (creditor.amount < EPSILON) {
      cIdx++;
    }
  }
  return settlements;
}
