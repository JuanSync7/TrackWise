
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HouseholdPage from '@/app/(app)/household/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Member, Contribution, Expense, SharedBudget, HouseholdSettlement } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY, HOUSEHOLD_EXPENSE_CATEGORY_ID } from '@/lib/constants';
import { formatISO, format as formatDateFns } from 'date-fns';
import { within } from '@testing-library/react';


const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock TripSettlementList as it's reused for HouseholdSettlementList
jest.mock('@/components/trips/trip-settlement-list', () => ({
  TripSettlementList: ({ settlements }: { settlements: HouseholdSettlement[] }) => (
    <div data-testid="mock-settlement-list">
      {settlements.length === 0 && <p>All Square!</p>}
      {settlements.map(s => (
        <div key={s.id} data-testid={`settlement-${s.owedByTripMemberId}-owes-${s.owedToTripMemberId}`}>
          {s.owedByTripMemberId} owes {s.owedToTripMemberId} {s.amount}
        </div>
      ))}
    </div>
  ),
}));


const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
} as FirebaseUser;

let mockMembersBase: Member[] = [];
let mockContributionsBase: Contribution[] = [];
let mockSharedBudgetsBase: SharedBudget[] = [];
let mockExpensesBase: Expense[] = [];
let mockHouseholdSettlementsBase: HouseholdSettlement[] = [];


const mockAppContextBase: Partial<AppContextType> = {
  members: mockMembersBase,
  contributions: mockContributionsBase,
  expenses: mockExpensesBase,
  sharedBudgets: mockSharedBudgetsBase,
  householdOverallSettlements: mockHouseholdSettlementsBase,
  categories: [{id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: "Household Expenses", iconName: "ReceiptText", color: "#ccc"}], 
  getCategoryById: (id) => id === HOUSEHOLD_EXPENSE_CATEGORY_ID ? {id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: "Household Expenses", iconName: "ReceiptText", color: "#ccc"} : undefined,
  
  addMember: jest.fn((data) => {
    const newMember = { ...data, id: `member-${Date.now()}`};
    mockMembersBase.push(newMember);
    (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock)();
  }),
  deleteMember: jest.fn((memberId) => {
    mockMembersBase = mockMembersBase.filter(m => m.id !== memberId);
    mockContributionsBase = mockContributionsBase.filter(c => c.memberId !== memberId);
    (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock)();
  }),
  addContribution: jest.fn((data) => {
     const newContrib = { ...data, id: `contrib-${Date.now()}`};
     mockContributionsBase.push(newContrib);
     (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock)();
  }),
  addExpense: jest.fn((data) => {
    const newExpense = { ...data, id: `exp-${Date.now()}`};
    mockExpensesBase.push(newExpense);
    if (newExpense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID || newExpense.sharedBudgetId) {
        (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock)();
    }
  }),
  
  getMemberTotalContribution: (memberId) => {
    return mockContributionsBase
      .filter(c => c.memberId === memberId)
      .reduce((sum, c) => sum + c.amount, 0);
  },
  getTotalHouseholdSpending: () => {
    let totalSpending = 0;
    const spentOnSharedBudgetsIds = new Set<string>();
    mockExpensesBase.forEach(expense => {
      if (expense.sharedBudgetId && mockSharedBudgetsBase.some(sb => sb.id === expense.sharedBudgetId)) {
        totalSpending += expense.amount;
        spentOnSharedBudgetsIds.add(expense.id);
      }
    });
    mockExpensesBase.forEach(expense => {
      if (expense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID && !spentOnSharedBudgetsIds.has(expense.id)) {
        totalSpending += expense.amount;
      }
    });
    return totalSpending;
  },
  getHouseholdMemberNetPotData: jest.fn((memberId): HouseholdMemberNetData => {
    const directContributionToPot = (mockAppContextBase.getMemberTotalContribution as jest.Mock)(memberId);
    const totalPotSpending = (mockAppContextBase.getTotalHouseholdSpending as jest.Mock)();
    const numMembers = mockMembersBase.length > 0 ? mockMembersBase.length : 1;
    const shareOfPotExpenses = totalPotSpending / numMembers;
    const netPotShare = directContributionToPot - shareOfPotExpenses;
    return { directContributionToPot, shareOfPotExpenses, netPotShare };
  }),
  triggerHouseholdSettlementCalculation: jest.fn(() => {
    // Simplified mock calculation for settlements
    const memberNetPotShares = mockMembersBase.map(member => ({
      id: member.id,
      netShare: (mockAppContextBase.getHouseholdMemberNetPotData as jest.Mock)(member.id).netPotShare,
    }));

    let debtors = memberNetPotShares.filter(m => m.netShare < -0.005).map(m => ({ id: m.id, amount: Math.abs(m.netShare) }));
    let creditors = memberNetPotShares.filter(m => m.netShare > 0.005).map(m => ({ id: m.id, amount: m.netShare }));
    debtors.sort((a,b) => b.amount - a.amount);
    creditors.sort((a,b) => b.amount - a.amount);

    const settlements: HouseholdSettlement[] = [];
    let dIdx = 0, cIdx = 0;
    while(dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
        const amount = Math.min(debtor.amount, creditor.amount);
        if (amount > 0.005) {
            settlements.push({ id: `settle-${Date.now()}-${dIdx}-${cIdx}`, tripId: 'household_pot_settlement', owedByTripMemberId: debtor.id, owedToTripMemberId: creditor.id, amount });
            debtor.amount -= amount;
            creditor.amount -= amount;
        }
        if (debtor.amount <= 0.005) dIdx++;
        if (creditor.amount <= 0.005) cIdx++;
    }
    mockHouseholdSettlementsBase = settlements;
  }),
  getHouseholdOverallSettlements: jest.fn(() => mockHouseholdSettlementsBase),
};

describe('HouseholdPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    mockMembersBase = appContextOverrides.members || [];
    mockContributionsBase = appContextOverrides.contributions || [];
    mockExpensesBase = appContextOverrides.expenses || [];
    mockSharedBudgetsBase = appContextOverrides.sharedBudgets || [];
    mockHouseholdSettlementsBase = appContextOverrides.householdOverallSettlements || [];
    
    (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock)(); // Initial calculation

    const finalAppContext: AppContextType = {
      ...mockAppContextBase,
      ...appContextOverrides,
       members: mockMembersBase,
      contributions: mockContributionsBase,
      expenses: mockExpensesBase,
      sharedBudgets: mockSharedBudgetsBase,
      householdOverallSettlements: mockHouseholdSettlementsBase,
    } as AppContextType;

    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext}>
          <HouseholdPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockToast.mockClear();
    (mockAppContextBase.addMember as jest.Mock).mockClear();
    (mockAppContextBase.deleteMember as jest.Mock).mockClear();
    (mockAppContextBase.addContribution as jest.Mock).mockClear();
    (mockAppContextBase.addExpense as jest.Mock).mockClear();
    (mockAppContextBase.getHouseholdMemberNetPotData as jest.Mock).mockClear().mockImplementation((memberId): HouseholdMemberNetData => {
        const directContributionToPot = mockContributionsBase.filter(c => c.memberId === memberId).reduce((sum, c) => sum + c.amount, 0);
        const totalPotSpendingCalc = (() => {
            let totalSpending = 0;
            const spentOnSharedBudgetsIds = new Set<string>();
            mockExpensesBase.forEach(expense => {
                if (expense.sharedBudgetId && mockSharedBudgetsBase.some(sb => sb.id === expense.sharedBudgetId)) {
                    totalSpending += expense.amount;
                    spentOnSharedBudgetsIds.add(expense.id);
                }
            });
            mockExpensesBase.forEach(expense => {
                if (expense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID && !spentOnSharedBudgetsIds.has(expense.id)) {
                    totalSpending += expense.amount;
                }
            });
            return totalSpending;
        })();
        const numMembers = mockMembersBase.length > 0 ? mockMembersBase.length : 1;
        const shareOfPotExpenses = totalPotSpendingCalc / numMembers;
        const netPotShare = directContributionToPot - shareOfPotExpenses;
        return { directContributionToPot, shareOfPotExpenses, netPotShare };
    });
    (mockAppContextBase.triggerHouseholdSettlementCalculation as jest.Mock).mockClear();
    (mockAppContextBase.getHouseholdOverallSettlements as jest.Mock).mockClear().mockImplementation(() => mockHouseholdSettlementsBase);

  });

  it('renders the page header and action buttons correctly', () => {
    renderPage({members: [{id: 'm1', name: 'Alice'}]}); // Need at least one member for export button to enable sometimes
    expect(screen.getByRole('heading', { name: /household management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export household data/i})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add shared expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new member/i })).toBeInTheDocument();
  });

  it('displays "No Household Members Yet" when no members are present', () => {
    renderPage({ members: [], contributions: [], expenses: [] });
    expect(screen.getByText(/no household members yet/i)).toBeInTheDocument();
    expect(screen.getByText(/all square!/i)).toBeInTheDocument(); // For settlement list
  });

  it('renders list of members if present', () => {
    renderPage({ members: [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }] });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('opens "Add New Member" dialog and calls addMember on save', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /add new member/i }));
    expect(screen.getByRole('dialog', { name: /add new household member/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/member name/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockAppContextBase.addMember).toHaveBeenCalledWith({ name: 'Charlie' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Member Added" }));
  });
  
  it('opens "Add Shared Expense" dialog and calls addExpense, including split options', async () => {
    renderPage({members: [{id: 'm1', name: 'Alice'}, {id: 'm2', name: 'Bob'}]});
    await user.click(screen.getByRole('button', { name: /add shared expense/i }));
    const dialog = screen.getByRole('dialog', { name: /add new shared expense/i });
    expect(dialog).toBeInTheDocument();

    // Check for splitting UI elements
    expect(within(dialog).getByLabelText(/split this expense/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/who paid?/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/split with whom?/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', {name: 'Alice'})).toBeInTheDocument();


    await user.type(within(dialog).getByLabelText(/description/i), 'Team Lunch');
    await user.clear(within(dialog).getByLabelText(/amount/i));
    await user.type(within(dialog).getByLabelText(/amount/i), '120');
    
    // Explicitly check "Split this expense" if it's not already (though it should be by default now)
    const splitCheckbox = within(dialog).getByLabelText(/split this expense/i);
    if (!splitCheckbox.hasAttribute('checked')) { // Or check via `toBeChecked` if appropriate for your Checkbox impl
        await user.click(splitCheckbox);
    }

    await user.click(within(dialog).getByRole('button', { name: /add expense/i }));

    expect(mockAppContextBase.addExpense).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Team Lunch',
      amount: 120,
      categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID, 
      isSplit: true,
      // splitWithMemberIds will depend on defaults, assuming Alice and Bob
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Shared Expense Added" }));
  });


  it('calculates and displays correct household pot summary (positive balance)', () => {
    const members = [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }];
    const contributions = [
        { id: 'c1', memberId: 'm1', amount: 100, date: formatISO(new Date()) },
        { id: 'c2', memberId: 'm2', amount: 150, date: formatISO(new Date()) },
    ];
    const expenses = [{ id: 'e1', description: 'Shared Item', amount: 50, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }];
    renderPage({ members, contributions, expenses });
    
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Shared Spending
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Remaining in Pot
  });

  it('calculates and displays correct "Net Share in Pot" for each member (positive pot balance)', async () => {
     const members = [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }];
    const contributions = [
        { id: 'c1', memberId: 'm1', amount: 100, date: formatISO(new Date()) },
        { id: 'c2', memberId: 'm2', amount: 150, date: formatISO(new Date()) },
    ]; // Total contrib = 250
    const expenses = [{ id: 'e1', description: 'Shared Item', amount: 50, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }]; // Total spend = 50
    // Pot remaining = 200. Alice share of expenses = 50/2=25. Bob share of expenses = 25.
    // Alice Net: 100 - 25 = 75
    // Bob Net: 150 - 25 = 125
    renderPage({ members, contributions, expenses });

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}75.00`)).toBeInTheDocument();
      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}125.00`)).toBeInTheDocument();
    });
  });
  
  it('calculates "Net Share in Pot" correctly when pot is negative and contributions were zero', async () => {
    const members = [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }];
    const contributions: Contribution[] = []; // No contributions
    const expenses = [{ id: 'e1', description: 'Unfunded Expense', amount: 100, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }];
    // Pot = -100. Alice share = -50, Bob share = -50.
    renderPage({ members, contributions, expenses });

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
      const aliceShareEl = within(aliceCard!).getByText(`-${DEFAULT_CURRENCY}50.00`);
      expect(aliceShareEl).toBeInTheDocument();
      expect(aliceShareEl).toHaveClass('text-destructive');
      const bobShareEl = within(bobCard!).getByText(`-${DEFAULT_CURRENCY}50.00`);
      expect(bobShareEl).toBeInTheDocument();
      expect(bobShareEl).toHaveClass('text-destructive');
    });
  });

  it('displays correct household settlements ("Who Owes Whom for Pot")', async () => {
    const members = [
        { id: 'm-alice', name: 'Alice' }, // Will be creditor
        { id: 'm-bob', name: 'Bob' },     // Will be debtor
    ];
    const contributions = [
        { id: 'c-alice', memberId: 'm-alice', amount: 100, date: formatISO(new Date()) },
    ]; // Alice contributes 100, Bob 0. Total Pot Contrib = 100.
    const expenses = [
        { id: 'e-shared', description: 'Big Shared Meal', amount: 40, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }
    ]; // Total Pot Spending = 40.
    // Alice NetPotData: contrib 100, shareOfExp 20 -> net +80
    // Bob NetPotData: contrib 0, shareOfExp 20 -> net -20
    // Expected Settlement: Bob owes Alice 20
    renderPage({ members, contributions, expenses });

    await waitFor(() => {
        expect(screen.getByText("Household Pot Settlement")).toBeInTheDocument();
        const settlementItem = screen.getByTestId(`settlement-m-bob-owes-m-alice`);
        expect(settlementItem).toHaveTextContent("m-bob owes m-alice 20");
    });
  });
  
   it('displays "All Square!" for household settlements when balanced', async () => {
    const members = [{ id: 'm-dave', name: 'Dave' }];
    const contributions = [{ id: 'c-dave', memberId: 'm-dave', amount: 50, date: formatISO(new Date()) }];
    const expenses = [{ id: 'e-dave-solo', description: 'Solo Expense covered', amount: 50, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }];
    // Dave NetPotShare = 50 - (50/1) = 0
    renderPage({ members, contributions, expenses });
    await waitFor(() => {
        expect(screen.getByText("Household Pot Settlement")).toBeInTheDocument();
        expect(screen.getByText("All Square!")).toBeInTheDocument();
    });
  });


});

