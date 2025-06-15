
import { POT_PAYER_ID } from '@/lib/constants';

export interface MemberInput {
  id: string;
  directCashContribution: number; 
}

export interface ExpenseInput {
  amount: number;
  isSplit: boolean;
  splitWithMemberIds: string[]; 
  paidByMemberId?: string; 
}

// Updated: Represents the comprehensive financial breakdown for a member
export interface CalculatedMemberFinancials {
  memberId: string;
  directCashContribution: number;        // Sum of explicit cash contributions
  amountPersonallyPaidForGroup: number; // Sum of expenses this member paid personally for the group
  totalShareOfAllGroupExpenses: number; // Their share of ALL expenses (pot-paid or member-paid)
  finalNetShareForSettlement: number;   // (Direct Cash + Personally Paid) - Share of All Group Expenses
}


export interface RawSettlement {
  owedByMemberId: string;
  owedToMemberId: string;
  amount: number;
}

const EPSILON = 0.005; 

/**
 * Calculates the comprehensive financial position for each member.
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
      finalNetShareForSettlement: parseFloat((memberInput?.directCashContribution || 0).toFixed(2)), // Start with cash contribution
    });
  });

  allGroupExpenses.forEach(expense => {
    let membersSharingThisExpense: string[] = [];
    if (expense.isSplit && expense.splitWithMemberIds.length > 0) {
      membersSharingThisExpense = expense.splitWithMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else {
      membersSharingThisExpense = [...allMemberIdsInGroup];
    }

    const numSharing = membersSharingThisExpense.length > 0 ? membersSharingThisExpense.length : 1;
    const individualShareOfThisExpense = parseFloat((expense.amount / numSharing).toFixed(2));

    // If an individual member paid, credit their netShare and track amountPersonallyPaidForGroup
    if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
      const payerResult = results.get(expense.paidByMemberId);
      if (payerResult) {
        payerResult.finalNetShareForSettlement += expense.amount;
        payerResult.amountPersonallyPaidForGroup += expense.amount;
      }
    }

    // Debit each sharing member for their share of this expense and update totalShareOfAllGroupExpenses
    membersSharingThisExpense.forEach(memberIdInSplit => {
      const memberResult = results.get(memberIdInSplit);
      if (memberResult) {
        memberResult.finalNetShareForSettlement -= individualShareOfThisExpense;
        memberResult.totalShareOfAllGroupExpenses += individualShareOfThisExpense;
      }
    });
  });

  // Final rounding for all calculated fields
  results.forEach(res => {
    res.amountPersonallyPaidForGroup = parseFloat(res.amountPersonallyPaidForGroup.toFixed(2));
    res.totalShareOfAllGroupExpenses = parseFloat(res.totalShareOfAllGroupExpenses.toFixed(2));
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
    .filter(m => m.finalNetShareForSettlement < -EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(Math.abs(m.finalNetShareForSettlement).toFixed(2)) }));

  let creditors = calculatedFinancialsArray
    .filter(m => m.finalNetShareForSettlement > EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(m.finalNetShareForSettlement.toFixed(2)) }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    let transferAmount = Math.min(debtor.amount, creditor.amount);
    transferAmount = parseFloat(transferAmount.toFixed(2));

    if (transferAmount > EPSILON) {
      settlements.push({
        owedByMemberId: debtor.id,
        owedToMemberId: creditor.id,
        amount: transferAmount,
      });

      debtor.amount = parseFloat((debtor.amount - transferAmount).toFixed(2));
      creditor.amount = parseFloat((creditor.amount - transferAmount).toFixed(2));
    }

    if (debtor.amount < EPSILON) {
      debtorIdx++;
    }
    if (creditor.amount < EPSILON) {
      creditorIdx++;
    }
  }
  return settlements;
}
