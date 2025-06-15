
import { POT_PAYER_ID } from '@/lib/constants';

export interface MemberInput {
  id: string;
  directContribution: number; // Explicit cash/value contributed by the member
}

export interface ExpenseInput {
  amount: number;
  isSplit: boolean;
  splitWithMemberIds: string[]; // IDs of members who benefited from/shared this expense
  paidByMemberId?: string; // ID of the member who paid, or POT_PAYER_ID if paid from communal funds
}

export interface NetPosition {
  memberId: string;
  netShare: number; // Overall net: (contributions + paid_for_others) - (share_of_pot_expenses + share_of_member_paid_expenses)
  // Optional: include these for display on Net Share in Pot cards if needed, or calculate separately
  directContribution?: number;
  shareOfPotPaidExpenses?: number;
}

export interface RawSettlement {
  owedByMemberId: string;
  owedToMemberId: string;
  amount: number;
}

const EPSILON = 0.005; // For floating point comparisons (e.g., half a cent)

/**
 * Calculates the net financial position for each member in a group,
 * considering direct contributions, who paid for expenses, and how expenses were split.
 * This is used for the overall "Who Owes Whom" settlement.
 */
export function calculateNetFinancialPositions(
  memberInputs: MemberInput[], // Explicit cash contributions
  allGroupExpenses: ExpenseInput[],
  allMemberIdsInGroup: string[]
): Map<string, NetPosition> {
  const netPositions = new Map<string, NetPosition>();

  // Initialize net positions with direct contributions
  allMemberIdsInGroup.forEach(memberId => {
    const memberInput = memberInputs.find(m => m.id === memberId);
    netPositions.set(memberId, {
      memberId: memberId,
      netShare: memberInput ? memberInput.directContribution : 0,
      directContribution: memberInput ? memberInput.directContribution : 0, // Store for reference
      shareOfPotPaidExpenses: 0, // Will be accumulated specifically for pot-paid expenses
    });
  });

  allGroupExpenses.forEach(expense => {
    let membersSharingThisExpense: string[] = [];
    if (expense.isSplit && expense.splitWithMemberIds.length > 0) {
      membersSharingThisExpense = expense.splitWithMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else {
      // If not explicitly split, assume shared by all members in the group for this expense
      membersSharingThisExpense = [...allMemberIdsInGroup];
    }

    const numSharing = membersSharingThisExpense.length > 0 ? membersSharingThisExpense.length : 1;
    const individualShareOfThisExpense = parseFloat((expense.amount / numSharing).toFixed(2));

    // If an individual member paid, credit their netShare for the full amount they paid
    if (expense.paidByMemberId && expense.paidByMemberId !== POT_PAYER_ID) {
      const payerPosition = netPositions.get(expense.paidByMemberId);
      if (payerPosition) {
        payerPosition.netShare += expense.amount;
      }
    }

    // Debit each sharing member for their share of this expense
    membersSharingThisExpense.forEach(memberIdInSplit => {
      const memberPosition = netPositions.get(memberIdInSplit);
      if (memberPosition) {
        memberPosition.netShare -= individualShareOfThisExpense;
        // If this expense was paid from the pot, also track it for the "Share of Pot-Paid Expenses" display
        if (expense.paidByMemberId === POT_PAYER_ID && memberPosition.shareOfPotPaidExpenses !== undefined) {
            memberPosition.shareOfPotPaidExpenses += individualShareOfThisExpense;
        }
      }
    });
  });

  // Round all final values
  netPositions.forEach(position => {
    position.netShare = parseFloat(position.netShare.toFixed(2));
    if (position.directContribution !== undefined) {
      position.directContribution = parseFloat(position.directContribution.toFixed(2));
    }
    if (position.shareOfPotPaidExpenses !== undefined) {
      position.shareOfPotPaidExpenses = parseFloat(position.shareOfPotPaidExpenses.toFixed(2));
    }
  });

  return netPositions;
}


/**
 * Generates a list of settlements (who owes whom) based on net financial positions.
 * Uses a greedy algorithm to minimize the number of transactions.
 */
export function generateSettlements(memberNetPositionsArray: NetPosition[]): RawSettlement[] {
  const settlements: RawSettlement[] = [];
  if (memberNetPositionsArray.length < 2) {
    return settlements;
  }

  let debtors = memberNetPositionsArray
    .filter(m => m.netShare < -EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(Math.abs(m.netShare).toFixed(2)) }));

  let creditors = memberNetPositionsArray
    .filter(m => m.netShare > EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(m.netShare.toFixed(2)) }));

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
