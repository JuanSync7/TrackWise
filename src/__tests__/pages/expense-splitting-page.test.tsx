
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExpenseSplittingPage from '@/app/(app)/household/expense-splitting/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Debt, Member } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY } from '@/lib/constants';

const mockUserBase = {
  uid: 'user-123',
  email: 'currentUser@example.com',
  displayName: 'Current User Name',
} as FirebaseUser;

const mockMembers: Member[] = [
  { id: 'member-1', name: 'Alice' },
  { id: 'member-2', name: 'Bob' },
  { id: 'member-user-123', name: 'Current User Name' }, // User who matches the logged-in user
];

const mockDebts: Debt[] = [
  { id: 'debt-1', expenseId: 'exp-1', expenseDescription: 'Dinner', amount: 10, owedByMemberId: 'member-user-123', owedToMemberId: 'member-1', isSettled: false, createdAt: new Date().toISOString() },
  { id: 'debt-2', expenseId: 'exp-2', expenseDescription: 'Movies', amount: 15, owedByMemberId: 'member-1', owedToMemberId: 'member-user-123', isSettled: false, createdAt: new Date().toISOString() },
  { id: 'debt-3', expenseId: 'exp-3', expenseDescription: 'Groceries', amount: 5, owedByMemberId: 'member-user-123', owedToMemberId: 'member-2', isSettled: false, createdAt: new Date().toISOString() },
  { id: 'debt-4', expenseId: 'exp-4', expenseDescription: 'Lunch', amount: 20, owedByMemberId: 'member-2', owedToMemberId: 'member-user-123', isSettled: true, createdAt: new Date().toISOString(), settledAt: new Date().toISOString() }, // Settled debt
];

const mockAppContextBase: Partial<AppContextType> = {
  members: mockMembers,
  debts: mockDebts,
  getMemberById: (id) => mockMembers.find(m => m.id === id),
  getAllUnsettledDebts: () => mockDebts.filter(d => !d.isSettled),
  getDebtsOwedByMember: (memberId) => mockDebts.filter(d => d.owedByMemberId === memberId && !d.isSettled),
  getDebtsOwedToMember: (memberId) => mockDebts.filter(d => d.owedToMemberId === memberId && !d.isSettled),
  settleDebt: jest.fn(),
  unsettleDebt: jest.fn(),
};

describe('ExpenseSplittingPage', () => {
  const renderPage = (appContextOverrides: Partial<AppContextType> = {}, authUser: FirebaseUser | null = mockUserBase) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    return render(
      <AuthContext.Provider value={{ user: authUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <ExpenseSplittingPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  it('renders the page header', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /expense splitting & debts/i })).toBeInTheDocument();
  });

  it('renders personalized summary cards when current user is a member', () => {
    renderPage();
    expect(screen.getByText(/you owe/i)).toBeInTheDocument();
    expect(screen.getByText(/you are owed/i)).toBeInTheDocument();
    expect(screen.getByText(/net balance/i)).toBeInTheDocument();
  });

  it('calculates and displays correct "You Owe" amount', () => {
    renderPage();
    // Current user owes 10 (to Alice) + 5 (to Bob) = 15
    expect(screen.getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument();
  });

  it('calculates and displays correct "You Are Owed" amount', () => {
    renderPage();
    // Current user is owed 15 (from Alice) - settled debt from Bob is ignored
    expect(screen.getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument();
  });
  
  it('calculates and displays correct "Net Balance"', () => {
    renderPage();
    // Net: 15 (owed to user) - 15 (owed by user) = 0
    // The UI shows +$0.00 for non-negative balances.
    expect(screen.getByText(`+${DEFAULT_CURRENCY}0.00`)).toBeInTheDocument(); 
  });

  it('shows "Personalized View Unavailable" message if current user is not found in members', () => {
    const nonMemberUser = { ...mockUserBase, displayName: "Unknown User", email: "unknown@example.com" };
    renderPage({}, nonMemberUser);
    expect(screen.getByText(/personalized view unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/you owe/i)).not.toBeInTheDocument();
  });

  it('renders tabs for "All Unsettled Debts", "I Owe", and "Owed To Me" when user is a member', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /all unsettled debts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /i owe/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /owed to me/i })).toBeInTheDocument();
  });
  
  it('does not render "I Owe" and "Owed To Me" tabs if user is not a member', () => {
    const nonMemberUser = { ...mockUserBase, displayName: "Unknown User" };
    renderPage({}, nonMemberUser);
    expect(screen.getByRole('tab', { name: /all unsettled debts/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /i owe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /owed to me/i })).not.toBeInTheDocument();
  });

  it('displays all unsettled debts correctly in the "All Unsettled Debts" tab', () => {
    renderPage(); // Defaults to "All Unsettled Debts" tab
    // 3 unsettled debts: debt-1, debt-2, debt-3
    expect(screen.getByText('Dinner')).toBeInTheDocument(); // debt-1
    expect(screen.getByText('Movies')).toBeInTheDocument(); // debt-2
    expect(screen.getByText('Groceries')).toBeInTheDocument(); // debt-3
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument(); // debt-4 is settled
  });
  
  // Add more tests for switching tabs and verifying content of "I Owe" and "Owed To Me" lists
});
