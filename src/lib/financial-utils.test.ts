
import { 
  calculateNetFinancialPositions, 
  generateSettlements, 
  type MemberInput, 
  type ExpenseInput,
  type CalculatedMemberFinancials,
  type RawSettlement
} from './financial-utils';
import { POT_PAYER_ID } from './constants';

describe('financial-utils', () => {
  const expectFinancialsToMatch = (
    result: Map<string, CalculatedMemberFinancials>,
    expected: Record<string, Partial<CalculatedMemberFinancials>>
  ) => {
    expect(result.size).toBe(Object.keys(expected).length);
    for (const memberId in expected) {
      const memberResult = result.get(memberId);
      expect(memberResult).toBeDefined();
      if (memberResult) {
        for (const key in expected[memberId]) {
          expect(memberResult[key as keyof CalculatedMemberFinancials]).toBeCloseTo(
            expected[memberId]![key as keyof Partial<CalculatedMemberFinancials>]!, 2
          );
        }
      }
    }
  };

  const expectSettlementsToMatch = (settlements: RawSettlement[], expected: RawSettlement[]) => {
    expect(settlements.length).toBe(expected.length);
    expected.forEach(expSettle => {
      expect(settlements).toContainEqual(expect.objectContaining({
        owedByMemberId: expSettle.owedByMemberId,
        owedToTripMemberId: expSettle.owedToTripMemberId,
        amount: expect.closeTo(expSettle.amount, 2)
      }));
    });
  };
  
  describe('calculateNetFinancialPositions', () => {
    it('handles no members, no expenses', () => {
      const result = calculateNetFinancialPositions([], [], []);
      expect(result.size).toBe(0);
    });

    it('handles one member, no expenses, no contributions', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 0 }];
      const result = calculateNetFinancialPositions(members, [], ['m1']);
      expectFinancialsToMatch(result, {
        'm1': { directCashContribution: 0, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 0, finalNetShareForSettlement: 0 },
      });
    });

    it('one member, with contribution, no expenses', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 100 }];
      const result = calculateNetFinancialPositions(members, [], ['m1']);
      expectFinancialsToMatch(result, {
        'm1': { directCashContribution: 100, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 0, finalNetShareForSettlement: 100 },
      });
    });

    it('one member, with pot-paid expense', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 100 }];
      const expenses: ExpenseInput[] = [{ amount: 30, isSplit: false, splitWithTripMemberIds: [], paidByMemberId: POT_PAYER_ID }];
      const result = calculateNetFinancialPositions(members, expenses, ['m1']);
      expectFinancialsToMatch(result, {
        'm1': { directCashContribution: 100, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 30, finalNetShareForSettlement: 70 },
      });
    });
    
    it('one member, with personally paid expense', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 0 }];
      const expenses: ExpenseInput[] = [{ amount: 30, isSplit: false, splitWithTripMemberIds: [], paidByMemberId: 'm1' }];
      const result = calculateNetFinancialPositions(members, expenses, ['m1']);
      expectFinancialsToMatch(result, {
        'm1': { directCashContribution: 0, amountPersonallyPaidForGroup: 30, totalShareOfAllGroupExpenses: 30, finalNetShareForSettlement: 0 },
      });
    });

    it('two members, simple pot-paid expense shared equally', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 20 }, { id: 'm2', directCashContribution: 0 }];
      const expenses: ExpenseInput[] = [{ amount: 10, isSplit: true, splitWithTripMemberIds: ['m1', 'm2'], paidByMemberId: POT_PAYER_ID }];
      const result = calculateNetFinancialPositions(members, expenses, ['m1', 'm2']);
      expectFinancialsToMatch(result, {
        'm1': { directCashContribution: 20, finalNetShareForSettlement: 15 }, // 20 - 5
        'm2': { directCashContribution: 0, finalNetShareForSettlement: -5 },  // 0 - 5
      });
    });

    it('two members, one pays personally for an expense shared equally', () => {
      const members: MemberInput[] = [{ id: 'm1', directCashContribution: 0 }, { id: 'm2', directCashContribution: 0 }];
      const expenses: ExpenseInput[] = [{ amount: 10, isSplit: true, splitWithTripMemberIds: ['m1', 'm2'], paidByMemberId: 'm1' }];
      const result = calculateNetFinancialPositions(members, expenses, ['m1', 'm2']);
      expectFinancialsToMatch(result, {
        'm1': { amountPersonallyPaidForGroup: 10, totalShareOfAllGroupExpenses: 5, finalNetShareForSettlement: 5 }, // 0 (contrib) + 10 (paid) - 5 (share)
        'm2': { amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 5, finalNetShareForSettlement: -5 }, // 0 (contrib) + 0 (paid) - 5 (share)
      });
    });

    it('three members, complex scenario with pot and personal payments', () => {
      const members: MemberInput[] = [
        { id: 'A', directCashContribution: 50 }, 
        { id: 'B', directCashContribution: 20 },
        { id: 'C', directCashContribution: 0 }
      ];
      const expenses: ExpenseInput[] = [
        { amount: 30, isSplit: true, splitWithTripMemberIds: ['A', 'B', 'C'], paidByMemberId: POT_PAYER_ID }, // Share: 10 each
        { amount: 15, isSplit: true, splitWithTripMemberIds: ['A', 'B'], paidByMemberId: 'A' }             // Share: 7.5 each for A,B
      ];
      const result = calculateNetFinancialPositions(members, expenses, ['A', 'B', 'C']);
      // A: 50 (contrib) - 10 (exp1 share) + 15 (paid exp2) - 7.5 (exp2 share) = 47.5
      // B: 20 (contrib) - 10 (exp1 share) - 7.5 (exp2 share) = 2.5
      // C: 0 (contrib) - 10 (exp1 share) = -10
      expectFinancialsToMatch(result, {
        'A': { directCashContribution: 50, amountPersonallyPaidForGroup: 15, totalShareOfAllGroupExpenses: 17.5, finalNetShareForSettlement: 47.5 },
        'B': { directCashContribution: 20, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 17.5, finalNetShareForSettlement: 2.5 },
        'C': { directCashContribution: 0, amountPersonallyPaidForGroup: 0, totalShareOfAllGroupExpenses: 10, finalNetShareForSettlement: -10 },
      });
    });
    
    it('expense split only with a subset of members', () => {
        const members: MemberInput[] = [
            { id: 'm1', directCashContribution: 10 },
            { id: 'm2', directCashContribution: 10 },
            { id: 'm3', directCashContribution: 10 },
        ];
        const expenses: ExpenseInput[] = [
            { amount: 30, isSplit: true, splitWithTripMemberIds: ['m1', 'm2'], paidByMemberId: POT_PAYER_ID } // Only m1 and m2 share this $30 expense, so $15 each
        ];
        const result = calculateNetFinancialPositions(members, expenses, ['m1', 'm2', 'm3']);
        // m1: 10 (contrib) - 15 (share) = -5
        // m2: 10 (contrib) - 15 (share) = -5
        // m3: 10 (contrib) - 0 (share) = 10
        expectFinancialsToMatch(result, {
            'm1': { directCashContribution: 10, totalShareOfAllGroupExpenses: 15, finalNetShareForSettlement: -5 },
            'm2': { directCashContribution: 10, totalShareOfAllGroupExpenses: 15, finalNetShareForSettlement: -5 },
            'm3': { directCashContribution: 10, totalShareOfAllGroupExpenses: 0, finalNetShareForSettlement: 10 },
        });
    });
  });

  describe('generateSettlements', () => {
    it('no settlements needed if all net shares are zero or positive close to zero', () => {
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'm1', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 0.001 },
        { memberId: 'm2', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -0.001 },
      ];
      const settlements = generateSettlements(financials);
      expect(settlements.length).toBe(0);
    });

    it('simple two-member settlement: m2 owes m1', () => {
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'm1', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 5 },
        { memberId: 'm2', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -5 },
      ];
      const settlements = generateSettlements(financials);
      expectSettlementsToMatch(settlements, [{ owedByMemberId: 'm2', owedToTripMemberId: 'm1', amount: 5 }]);
    });
    
    it('three members: C owes A', () => {
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'A', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 10 },
        { memberId: 'B', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 0 },
        { memberId: 'C', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -10 },
      ];
      const settlements = generateSettlements(financials);
      expectSettlementsToMatch(settlements, [{ owedByMemberId: 'C', owedToTripMemberId: 'A', amount: 10 }]);
    });

    it('three members: one debtor, two creditors', () => {
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'A', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 7 },
        { memberId: 'B', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 3 },
        { memberId: 'C', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -10 },
      ];
      const settlements = generateSettlements(financials);
      // C owes A 7, C owes B 3 (order might vary based on sorting)
      expect(settlements.length).toBe(2);
      expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'C', owedToTripMemberId: 'A', amount: 7 }));
      expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'C', owedToTripMemberId: 'B', amount: 3 }));
    });

    it('three members: two debtors, one creditor', () => {
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'A', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 15 },
        { memberId: 'B', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -10 },
        { memberId: 'C', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -5 },
      ];
      const settlements = generateSettlements(financials);
      // B owes A 10, C owes A 5 (order might vary)
      expect(settlements.length).toBe(2);
      expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'B', owedToTripMemberId: 'A', amount: 10 }));
      expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'C', owedToTripMemberId: 'A', amount: 5 }));
    });

    it('complex scenario: C owes A, B also owes A (from test case in calculateNetFinancialPositions)', () => {
      // Net Positions: A: +47.5, B: +2.5, C: -10
      const financials: CalculatedMemberFinancials[] = [
        { memberId: 'A', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 47.5 },
        { memberId: 'B', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 2.5 },
        { memberId: 'C', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -10 },
      ];
      // This is tricky because C owes 10. This 10 could go to A.
      // The total system needs to balance.
      // Debtors: C (-10)
      // Creditors: A (+47.5), B (+2.5)
      // C pays A $10.
      // A's effective credit becomes 47.5, B's is 2.5. C is settled.
      // The remaining $40 (47.5+2.5-10) would be pot surplus distributed by UI.
      // Here, generateSettlements only does member-to-member.
      const settlements = generateSettlements(financials);
       expectSettlementsToMatch(settlements, [
         { owedByMemberId: 'C', owedToTripMemberId: 'A', amount: 10 },
       ]);
    });

     it('Scenario from user: M1 (-5), M2 (-5), M3 (+10)', () => {
        const financials: CalculatedMemberFinancials[] = [
            { memberId: 'm1', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -5 },
            { memberId: 'm2', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: -5 },
            { memberId: 'm3', directCashContribution:0, amountPersonallyPaidForGroup:0, totalShareOfAllGroupExpenses:0, finalNetShareForSettlement: 10 },
        ];
        const settlements = generateSettlements(financials);
        expect(settlements.length).toBe(2);
        expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'm1', owedToTripMemberId: 'm3', amount: 5 }));
        expect(settlements).toContainEqual(expect.objectContaining({ owedByMemberId: 'm2', owedToTripMemberId: 'm3', amount: 5 }));
    });

  });
});
