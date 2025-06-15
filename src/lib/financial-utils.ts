
export interface MemberInput {
  id: string;
  directContribution: number;
}

export interface ExpenseInput {
  amount: number;
  isSplit: boolean;
  splitWithMemberIds: string[];
  paidByMemberId?: string; // Optional: useful for some contexts, not directly used in net share calc here
}

export interface NetPosition {
  memberId: string;
  directContribution: number;
  shareOfExpenses: number;
  netShare: number;
}

export interface RawSettlement {
  owedByMemberId: string;
  owedToMemberId: string;
  amount: number;
}

const EPSILON = 0.005; // For floating point comparisons (e.g., half a cent)

/**
 * Calculates the net financial position for each member in a group.
 * Net Position = Member's Direct Contributions - Member's Share of All Group Expenses.
 */
export function calculateNetFinancialPositions(
  memberInputs: MemberInput[],
  allGroupExpenses: ExpenseInput[],
  allMemberIdsInGroup: string[]
): Map<string, NetPosition> {
  const netPositions = new Map<string, NetPosition>();
  const numMembersInGroup = allMemberIdsInGroup.length > 0 ? allMemberIdsInGroup.length : 1;

  // Initialize net positions with direct contributions
  memberInputs.forEach(member => {
    netPositions.set(member.id, {
      memberId: member.id,
      directContribution: member.directContribution,
      shareOfExpenses: 0,
      netShare: member.directContribution, // Start with contribution
    });
  });

  // Calculate each member's share of each expense and subtract from their netShare
  allGroupExpenses.forEach(expense => {
    let membersSharingThisExpense: string[] = [];
    if (expense.isSplit && expense.splitWithMemberIds.length > 0) {
      membersSharingThisExpense = expense.splitWithMemberIds.filter(id => allMemberIdsInGroup.includes(id));
    } else {
      membersSharingThisExpense = [...allMemberIdsInGroup]; // Shared among all if not explicitly split
    }

    const numSharing = membersSharingThisExpense.length > 0 ? membersSharingThisExpense.length : 1;
    const individualShareOfThisExpense = expense.amount / numSharing;

    membersSharingThisExpense.forEach(memberId => {
      const currentPosition = netPositions.get(memberId);
      if (currentPosition) {
        currentPosition.shareOfExpenses += individualShareOfThisExpense;
        currentPosition.netShare -= individualShareOfThisExpense;
      }
    });
  });
  
  // Round all final values to 2 decimal places
  netPositions.forEach(position => {
    position.directContribution = parseFloat(position.directContribution.toFixed(2));
    position.shareOfExpenses = parseFloat(position.shareOfExpenses.toFixed(2));
    position.netShare = parseFloat(position.netShare.toFixed(2));
  });

  return netPositions;
}


/**
 * Generates a list of settlements (who owes whom) based on net financial positions.
 * Uses a greedy algorithm to minimize the number of transactions.
 */
export function generateSettlements(memberNetPositions: NetPosition[]): RawSettlement[] {
  const settlements: RawSettlement[] = [];
  if (memberNetPositions.length < 2) {
    return settlements;
  }

  let debtors = memberNetPositions
    .filter(m => m.netShare < -EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(Math.abs(m.netShare).toFixed(2)) }));
  
  let creditors = memberNetPositions
    .filter(m => m.netShare > EPSILON)
    .map(m => ({ id: m.memberId, amount: parseFloat(m.netShare.toFixed(2)) }));

  // Sort by amount to potentially optimize, though standard greedy works without strict sorting if iterated
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    let transferAmount = Math.min(debtor.amount, creditor.amount);
    transferAmount = parseFloat(transferAmount.toFixed(2)); // Crucial rounding for transaction amount

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
