
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HouseholdPage from '@/app/(app)/household/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Member, Contribution, Expense, SharedBudget } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY, HOUSEHOLD_EXPENSE_CATEGORY_ID } from '@/lib/constants';
import { formatISO, format as formatDateFns } from 'date-fns';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
} as FirebaseUser;

const mockMembersBase: Member[] = [
  { id: 'member-1', name: 'Alice' },
  { id: 'member-2', name: 'Bob' },
];

const mockContributionsBase: Contribution[] = [
  { id: 'contrib-1', memberId: 'member-1', amount: 100, date: formatISO(new Date()), notes: 'Alice contribution' },
  { id: 'contrib-2', memberId: 'member-2', amount: 150, date: formatISO(new Date()), notes: 'Bob contribution' },
];

const mockSharedBudgetsBase: SharedBudget[] = [
    { id: 'sb-household', name: 'General Household', amount: 500, period: 'monthly', createdAt: formatISO(new Date()), currentSpending: 0 }
];

const mockExpensesBase: Expense[] = [
    { id: 'exp-1', description: 'Shared Groceries', amount: 50, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID, sharedBudgetId: undefined },
];


const mockAppContextBase: Partial<AppContextType> = {
  members: mockMembersBase,
  contributions: mockContributionsBase,
  expenses: mockExpensesBase,
  sharedBudgets: mockSharedBudgetsBase,
  categories: [{id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: "Household Expenses", iconName: "ReceiptText", color: "#ccc"}], // Ensure HOUSEHOLD_EXPENSE_CATEGORY_ID is defined
  getCategoryById: (id) => id === HOUSEHOLD_EXPENSE_CATEGORY_ID ? {id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: "Household Expenses", iconName: "ReceiptText", color: "#ccc"} : undefined,
  addMember: jest.fn(),
  deleteMember: jest.fn(),
  addContribution: jest.fn(),
  addExpense: jest.fn(),
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
};

describe('HouseholdPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    const currentMembers = appContextOverrides.members || mockMembersBase;
    const currentContributions = appContextOverrides.contributions || mockContributionsBase;
    const currentExpenses = appContextOverrides.expenses || mockExpensesBase;
    const currentSharedBudgets = appContextOverrides.sharedBudgets || mockSharedBudgetsBase;


    const finalAppContext: Partial<AppContextType> = {
      ...mockAppContextBase,
      ...appContextOverrides,
      members: currentMembers,
      contributions: currentContributions,
      expenses: currentExpenses,
      sharedBudgets: currentSharedBudgets,
      getMemberTotalContribution: (memberId) => {
        return currentContributions
          .filter(c => c.memberId === memberId)
          .reduce((sum, c) => sum + c.amount, 0);
      },
      getTotalHouseholdSpending: () => { // This needs to use the currentExpenses and currentSharedBudgets from overrides
        let totalSpending = 0;
        const spentOnSharedBudgetsIds = new Set<string>();

        currentExpenses.forEach(expense => {
          if (expense.sharedBudgetId && currentSharedBudgets.some(sb => sb.id === expense.sharedBudgetId)) {
            totalSpending += expense.amount;
            spentOnSharedBudgetsIds.add(expense.id);
          }
        });

        currentExpenses.forEach(expense => {
          if (expense.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID && !spentOnSharedBudgetsIds.has(expense.id)) {
            totalSpending += expense.amount;
          }
        });
        return totalSpending;
      },
    };

    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
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
  });

  it('renders the page header and action buttons correctly', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /household management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export household data/i})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add shared expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new member/i })).toBeInTheDocument();
  });

  it('displays "No Household Members Yet" when no members are present', () => {
    renderPage({ members: [], contributions: [], expenses: [] });
    expect(screen.getByText(/no household members yet/i)).toBeInTheDocument();
  });

  it('renders list of members if present', () => {
    renderPage();
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

  it('opens "Add Contribution" dialog and calls addContribution on save', async () => {
    renderPage();
    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    if (!aliceCard) throw new Error("Alice card not found");

    const optionsButton = aliceCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Alice not found");
    await user.click(optionsButton);

    const addContributionButton = await screen.findByRole('menuitem', { name: /add contribution/i });
    await user.click(addContributionButton);

    expect(screen.getByRole('dialog', { name: /add contribution for alice/i })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '50');
    // Date is pre-filled
    await user.click(screen.getByRole('button', { name: /save contribution/i }));

    expect(mockAppContextBase.addContribution).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'member-1', // Alice's ID
      amount: 50,
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Contribution Added" }));
  });

  it('opens "Add Shared Expense" dialog and calls addExpense on save, defaulting to household category', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /add shared expense/i }));
    expect(screen.getByRole('dialog', { name: /add new shared expense/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/description/i), 'Team Lunch');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '120');
    // Not selecting a category or shared budget explicitly
    // Check default split behavior
    expect(screen.getByLabelText(/split this expense/i)).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Alice'})).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Bob'})).toBeChecked();


    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(mockAppContextBase.addExpense).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Team Lunch',
      amount: 120,
      categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID, // Should default here
      isSplit: true,
      // paidByMemberId would be current user if set, or empty
      splitWithMemberIds: ['member-1', 'member-2'] // Assuming Alice and Bob are the mockMembersBase
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Shared Expense Added" }));
  });

  it('calculates and displays correct household pot summary (positive balance)', () => {
    // Alice: 100, Bob: 150. Total Contributions: 250
    // Shared Expense: 50. Total Spending: 50
    // Remaining in Pot: 250 - 50 = 200
    renderPage(); // Uses mockAppContextBase defaults
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Shared Spending
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Remaining in Pot
    expect(screen.getByText(/20% of pot used/i)).toBeInTheDocument(); // (50/250)*100
  });

  it('calculates and displays correct "Net Share in Pot" for each member (positive pot balance)', () => {
    // Pot: 200. Alice contributed 100/250 = 40%. Bob contributed 150/250 = 60%.
    // Alice share: 0.40 * 200 = 80
    // Bob share: 0.60 * 200 = 120
    renderPage();
    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');

    expect(aliceCard).toHaveTextContent(`Net Share in Pot:${DEFAULT_CURRENCY}80.00`);
    expect(bobCard).toHaveTextContent(`Net Share in Pot:${DEFAULT_CURRENCY}120.00`);
  });

  it('calculates and displays correct household pot summary (negative balance)', () => {
    const highExpenses: Expense[] = [
      { id: 'exp-high', description: 'Big Repair', amount: 300, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID, sharedBudgetId: undefined },
    ];
    // Total Contributions: 250 (Alice 100, Bob 150 from mockContributionsBase)
    // Total Spending: 300 (from highExpenses override)
    // Remaining in Pot: 250 - 300 = -50
    renderPage({ expenses: highExpenses, contributions: mockContributionsBase, members: mockMembersBase });
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}300.00`)).toBeInTheDocument(); // Total Shared Spending
    expect(screen.getByText(`-${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Remaining in Pot (negative)
    expect(screen.getByText(/100% of pot used/i)).toBeInTheDocument(); // (300/250)*100, capped at 100 if spending > contributions
  });

  it('calculates and displays correct "Net Share in Pot" for each member (negative pot balance)', () => {
    const highExpenses: Expense[] = [
      { id: 'exp-high', description: 'Big Repair', amount: 300, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID, sharedBudgetId: undefined },
    ];
    // Pot: -50. Alice contributed 100/250 = 40%. Bob contributed 150/250 = 60%.
    // Alice share: 0.40 * -50 = -20
    // Bob share: 0.60 * -50 = -30
    renderPage({ expenses: highExpenses, contributions: mockContributionsBase, members: mockMembersBase });

    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');

    expect(aliceCard).toHaveTextContent(`Net Share in Pot:-${DEFAULT_CURRENCY}20.00`);
    expect(bobCard).toHaveTextContent(`Net Share in Pot:-${DEFAULT_CURRENCY}30.00`);

    const aliceShareElement = screen.getByText(`-${DEFAULT_CURRENCY}20.00`);
    expect(aliceShareElement).toHaveClass('text-destructive');
    const bobShareElement = screen.getByText(`-${DEFAULT_CURRENCY}30.00`);
    expect(bobShareElement).toHaveClass('text-destructive');
  });

  it('calculates "Net Share in Pot" as equally shared deficit when total contributions are zero and pot is negative', () => {
    const members: Member[] = [{ id: 'm1', name: 'Member1' }, { id: 'm2', name: 'Member2' }];
    const expenses: Expense[] = [
      { id: 'exp-deficit', description: 'Unexpected Bill', amount: 100, date: formatISO(new Date()), categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID },
    ];
    // Total Contributions: 0
    // Total Spending: 100
    // Remaining in Pot: -100
    // Each member's share: -100 / 2 = -50
    renderPage({
      members: members,
      contributions: [], // No contributions
      expenses: expenses,
      sharedBudgets: [],
      getMemberTotalContribution: () => 0, // Ensure this returns 0 for all members
      getTotalHouseholdSpending: () => expenses.reduce((sum, e) => sum + e.amount, 0),
    });

    const member1Card = screen.getByText('Member1').closest('div[class*="card"]');
    const member2Card = screen.getByText('Member2').closest('div[class*="card"]');

    expect(member1Card).toHaveTextContent(`Net Share in Pot:-${DEFAULT_CURRENCY}50.00`);
    expect(member2Card).toHaveTextContent(`Net Share in Pot:-${DEFAULT_CURRENCY}50.00`);
  });


  it('handles deletion of a member', async () => {
    renderPage();
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
    if (!bobCard) throw new Error("Bob card not found");

    const optionsButton = bobCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Bob not found");
    await user.click(optionsButton);

    const deleteButton = await screen.findByRole('menuitem', { name: /delete member/i });
    await user.click(deleteButton);

    expect(screen.getByRole('alertdialog', { name: /are you sure/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockAppContextBase.deleteMember).toHaveBeenCalledWith('member-2'); // Bob's ID
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Member Deleted" }));
  });

  it('exports household data to CSV correctly', async () => {
    const mockExportToCsv = jest.fn();
    // Spy on the actual utility from the correct module path
    jest.spyOn(require('@/lib/utils'), 'exportToCsv').mockImplementation(mockExportToCsv);

    // Prepare specific data for this test to ensure calculations are predictable
    const testMembers: Member[] = [{ id: 'm1', name: 'Tester1' }];
    const testContributions: Contribution[] = [{ id: 'c1', memberId: 'm1', amount: 200, date: '2023-01-01', notes: 'Initial' }];
    const testExpenses: Expense[] = [{ id: 'e1', description: 'Test Shared Item', amount: 50, date: '2023-01-02', categoryId: HOUSEHOLD_EXPENSE_CATEGORY_ID }];

    renderPage({
      members: testMembers,
      contributions: testContributions,
      expenses: testExpenses,
      sharedBudgets: [], // No specific shared budgets for this simple case
      getMemberTotalContribution: (memberId) => testContributions.filter(c => c.memberId === memberId).reduce((sum, c) => sum + c.amount, 0),
      getTotalHouseholdSpending: () => testExpenses.filter(e => e.categoryId === HOUSEHOLD_EXPENSE_CATEGORY_ID).reduce((sum, e) => sum + e.amount, 0),
    });

    await user.click(screen.getByRole('button', { name: /export household data/i }));

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);

    const expectedFilename = `trackwise_household_data_${formatDateFns(new Date(), 'yyyy-MM-dd')}.csv`;
    const capturedArgs = mockExportToCsv.mock.calls[0];
    const csvData = capturedArgs[1]; // This is the array of arrays

    expect(capturedArgs[0]).toBe(expectedFilename);

    // Check Household Pot Summary
    expect(csvData).toEqual(expect.arrayContaining([
      ["Household Pot Summary"],
      ["Metric", "Amount"],
      [`Total Household Contributions (${DEFAULT_CURRENCY})`, "200.00"],
      [`Total Shared Household Spending (${DEFAULT_CURRENCY})`, "50.00"],
      [`Remaining in Pot (${DEFAULT_CURRENCY})`, "150.00"],
    ]));

    // Check Member Overview
    // Tester1: Contributed 200. Pot remaining 150. (200/200) * 150 = 150
    expect(csvData).toEqual(expect.arrayContaining([
      ["Member Overview"],
      ["Member Name", `Total Direct Contributions (${DEFAULT_CURRENCY})`, `Net Share in Pot (${DEFAULT_CURRENCY})`],
      ["Tester1", "200.00", "150.00"],
    ]));

    // Check Individual Contributions
    expect(csvData).toEqual(expect.arrayContaining([
      ["Individual Contributions"],
      ["Member Name", `Amount (${DEFAULT_CURRENCY})`, "Date", "Notes"],
      ["Tester1", "200.00", "2023-01-01", "Initial"],
    ]));

    // Check Shared Expenses Affecting Pot
    expect(csvData).toEqual(expect.arrayContaining([
      ["Shared Expenses Affecting Pot"],
      ["Description", `Amount (${DEFAULT_CURRENCY})`, "Date", "Source"],
      ["Test Shared Item", "50.00", "2023-01-02", "Category: Household Expenses"],
    ]));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Household Data Exported" }));

    jest.restoreAllMocks(); // Clean up spy
  });

});



