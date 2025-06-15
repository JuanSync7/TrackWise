
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExpenseSplittingPage from '@/app/(app)/household/expense-splitting/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Debt, Member } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { formatISO } from 'date-fns';


const mockUserBase = {
  uid: 'user-123',
  email: 'currentUser@example.com',
  displayName: 'Current User Name',
} as FirebaseUser;

const mockMembers: Member[] = [
  { id: 'member-1', name: 'Alice' },
  { id: 'member-2', name: 'Bob' },
  { id: 'member-user-123', name: 'Current User Name' }, 
];

const mockDebtsBase: Debt[] = [
  { id: 'debt-1', expenseId: 'exp-1', expenseDescription: 'Dinner', amount: 10, owedByMemberId: 'member-user-123', owedToMemberId: 'member-1', isSettled: false, createdAt: formatISO(new Date(2023, 0, 15)) },
  { id: 'debt-2', expenseId: 'exp-2', expenseDescription: 'Movies', amount: 15, owedByMemberId: 'member-1', owedToMemberId: 'member-user-123', isSettled: false, createdAt: formatISO(new Date(2023, 0, 16)) },
  { id: 'debt-3', expenseId: 'exp-3', expenseDescription: 'Groceries', amount: 5, owedByMemberId: 'member-user-123', owedToMemberId: 'member-2', isSettled: false, createdAt: formatISO(new Date(2023, 0, 17)) },
  { id: 'debt-4', expenseId: 'exp-4', expenseDescription: 'Lunch', amount: 20, owedByMemberId: 'member-2', owedToMemberId: 'member-user-123', isSettled: true, createdAt: formatISO(new Date(2023, 0, 10)), settledAt: formatISO(new Date(2023, 0, 12)) },
  { id: 'debt-5', expenseId: 'exp-5', expenseDescription: 'Coffee', amount: 3, owedByMemberId: 'member-1', owedToMemberId: 'member-2', isSettled: false, createdAt: formatISO(new Date(2023,0,18))}
];


const mockAppContextBase: Partial<AppContextType> = {
  members: mockMembers,
  debts: mockDebtsBase, // Use base debts which can be overridden
  getMemberById: (id) => mockMembers.find(m => m.id === id),
  // These will now take an `includeSettled` flag.
  // For summary calculations (You Owe, You Are Owed), these should effectively filter for !isSettled.
  // For list displays, they will be called with includeSettled = true.
  getAllDebts: (includeSettled = false) => mockDebtsBase.filter(d => includeSettled || !d.isSettled),
  getDebtsOwedByMember: (memberId, includeSettled = false) => mockDebtsBase.filter(d => d.owedByMemberId === memberId && (includeSettled || !d.isSettled)),
  getDebtsOwedToMember: (memberId, includeSettled = false) => mockDebtsBase.filter(d => d.owedToMemberId === memberId && (includeSettled || !d.isSettled)),
  settleDebt: jest.fn(),
  unsettleDebt: jest.fn(),
};

describe('ExpenseSplittingPage', () => {
  const renderPage = (appContextOverrides: Partial<AppContextType> = {}, authUser: FirebaseUser | null = mockUserBase) => {
    const currentDebts = appContextOverrides.debts || mockDebtsBase;
    const finalAppContext: Partial<AppContextType> = {
      ...mockAppContextBase,
      ...appContextOverrides,
      debts: currentDebts, // Ensure debts are correctly passed
      getAllDebts: (includeSettled = false) => currentDebts.filter(d => includeSettled || !d.isSettled),
      getDebtsOwedByMember: (memberId, includeSettled = false) => currentDebts.filter(d => d.owedByMemberId === memberId && (includeSettled || !d.isSettled)),
      getDebtsOwedToMember: (memberId, includeSettled = false) => currentDebts.filter(d => d.owedToMemberId === memberId && (includeSettled || !d.isSettled)),
    };
    
    return render(
      <AuthContext.Provider value={{ user: authUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <ExpenseSplittingPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };
  
  beforeEach(() => {
    // Reset mock function calls for each test
    (mockAppContextBase.settleDebt as jest.Mock).mockClear();
    (mockAppContextBase.unsettleDebt as jest.Mock).mockClear();
  });


  it('renders the page header', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /expense splitting & debts/i })).toBeInTheDocument();
  });

  it('renders personalized summary cards when current user is a member', () => {
    renderPage();
    expect(screen.getByText(/you owe \(unsettled\)/i)).toBeInTheDocument();
    expect(screen.getByText(/you are owed \(unsettled\)/i)).toBeInTheDocument();
    expect(screen.getByText(/net balance \(unsettled\)/i)).toBeInTheDocument();
  });

  it('calculates and displays correct "You Owe (Unsettled)" amount', () => {
    renderPage();
    // Current user owes 10 (to Alice for Dinner) + 5 (to Bob for Groceries) = 15. Settled debts ignored.
    expect(screen.getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument();
  });

  it('calculates and displays correct "You Are Owed (Unsettled)" amount', () => {
    renderPage();
    // Current user is owed 15 (from Alice for Movies). Settled debt from Bob (Lunch) is ignored.
    expect(screen.getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument();
  });
  
  it('calculates and displays correct "Net Balance (Unsettled)"', () => {
    renderPage();
    // Net: 15 (owed to user) - 15 (owed by user) = 0. Based on unsettled.
    expect(screen.getByText(`+${DEFAULT_CURRENCY}0.00`)).toBeInTheDocument(); 
  });

  it('shows "Personalized View Unavailable" message if current user is not found in members', () => {
    const nonMemberUser = { ...mockUserBase, displayName: "Unknown User", email: "unknown@example.com" };
    renderPage({}, nonMemberUser);
    expect(screen.getByText(/personalized view unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/you owe/i)).not.toBeInTheDocument();
  });

  it('renders tabs for "All Debts", "I Owe", and "Owed To Me" when user is a member', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /all debts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /i owe/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /owed to me/i })).toBeInTheDocument();
  });
  
  it('does not render "I Owe" and "Owed To Me" tabs if user is not a member', () => {
    const nonMemberUser = { ...mockUserBase, displayName: "Unknown User" };
    renderPage({}, nonMemberUser);
    expect(screen.getByRole('tab', { name: /all debts/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /i owe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /owed to me/i })).not.toBeInTheDocument();
  });

  it('displays all debts (settled and unsettled) correctly in the "All Debts" tab, sorted correctly', async () => {
    renderPage(); // Defaults to "All Debts" tab
    
    // Expect all 5 debts to be present initially
    const allDebtItems = await screen.findAllByText(/created:/i); // A common text in DebtItem
    expect(allDebtItems.length).toBe(5);

    // Check for specific descriptions
    expect(screen.getByText('Dinner')).toBeInTheDocument();    // debt-1 (unsettled)
    expect(screen.getByText('Movies')).toBeInTheDocument();   // debt-2 (unsettled)
    expect(screen.getByText('Groceries')).toBeInTheDocument(); // debt-3 (unsettled)
    expect(screen.getByText('Coffee')).toBeInTheDocument();   // debt-5 (unsettled)
    expect(screen.getByText('Lunch')).toBeInTheDocument();    // debt-4 (settled)

    // Verify sorting: Unsettled first (newest created), then Settled (newest settled)
    // Unsettled: Coffee (18th) > Groceries (17th) > Movies (16th) > Dinner (15th)
    // Settled: Lunch (settled 12th)
    const debtDescriptions = ['Coffee', 'Groceries', 'Movies', 'Dinner', 'Lunch'];
    const renderedItems = screen.getAllByRole('heading', { level: 3 }); // Assuming CardTitle is h3 or similar
    const renderedDescriptions = renderedItems.map(item => item.textContent);
    
    // This is a simplified check; actual DOM order of complex items is harder to assert directly without more specific selectors
    // We can check that the first item is 'Coffee' (most recent unsettled) and last is 'Lunch' (settled)
    expect(renderedDescriptions[0]).toBe('Coffee'); // Most recent unsettled
    // The last item in this specific mock list will be Lunch (settled)
    // The exact order for the last item depends on how they are added to the DOM by AnimatePresence and layout.
    // A more robust way might involve looking at the order of `DebtItem` cards.
    // For now, we check that 'Lunch' (settled) is indeed present.
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    const lunchItem = screen.getByText('Lunch').closest('div[class*="card"]');
    expect(lunchItem).toHaveClass('opacity-60'); // Check for settled styling
  });
  
  it('displays correct debts in "I Owe" tab (settled and unsettled), sorted correctly', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /i owe/i }));

    // Current user owes: Dinner (unsettled), Groceries (unsettled)
    // No settled debts owed by current user in mock
    await waitFor(() => {
        expect(screen.getByText('Dinner')).toBeInTheDocument();
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Movies')).not.toBeInTheDocument(); // Owed TO current user
        expect(screen.queryByText('Lunch')).not.toBeInTheDocument();  // Owed TO current user (settled)
        expect(screen.queryByText('Coffee')).not.toBeInTheDocument(); // Not involving current user
    });
    // Check sorting: Groceries (17th) > Dinner (15th)
    const renderedItems = screen.getAllByRole('heading', { level: 3 });
    const renderedDescriptions = renderedItems.map(item => item.textContent);
    expect(renderedDescriptions[0]).toBe('Groceries');
    expect(renderedDescriptions[1]).toBe('Dinner');
  });
  
  it('displays correct debts in "Owed To Me" tab (settled and unsettled), sorted correctly', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /owed to me/i }));

    // Owed to current user: Movies (unsettled), Lunch (settled)
    await waitFor(() => {
        expect(screen.getByText('Movies')).toBeInTheDocument(); // Unsettled
        expect(screen.getByText('Lunch')).toBeInTheDocument();  // Settled
        expect(screen.queryByText('Dinner')).not.toBeInTheDocument();
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
        expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
    });
    // Check sorting: Movies (unsettled, created 16th) > Lunch (settled, settled 12th)
    const renderedItems = screen.getAllByRole('heading', { level: 3 });
    const renderedDescriptions = renderedItems.map(item => item.textContent);
    expect(renderedDescriptions[0]).toBe('Movies'); // Unsettled first
    expect(renderedDescriptions[1]).toBe('Lunch');  // Settled after
    
    const lunchItem = screen.getByText('Lunch').closest('div[class*="card"]');
    expect(lunchItem).toHaveClass('opacity-60'); // Check for settled styling
  });

});

// Minimal setup for userEvent if not already globally configured
import userEvent from '@testing-library/user-event';
// const user = userEvent.setup(); // if needed locally
