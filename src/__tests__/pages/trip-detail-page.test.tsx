
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripDetailPage from '@/app/(app)/trips/[tripId]/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Trip, TripMember, TripContribution, TripExpense, TripMemberNetData } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY, INITIAL_CATEGORIES } from '@/lib/constants';
import { formatISO, format as formatDateFns } from 'date-fns';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useParams: () => ({ tripId: 'trip-123' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode, href: string }) => {
    return <a href={href}>{children}</a>;
  };
});


const mockAuthUser = {
  uid: 'auth-user-uid',
  email: 'auth@example.com',
  displayName: 'Auth User',
} as FirebaseUser;

const mockTripBase: Trip = {
  id: 'trip-123',
  name: 'Adventure Trip',
  description: 'An exciting adventure!',
  createdAt: formatISO(new Date(2023, 0, 1)),
};

// Base lists for AppContext, can be overridden in tests
let mockTripMembersList: TripMember[] = [];
let mockTripContributionsList: TripContribution[] = [];
let mockTripExpensesList: TripExpense[] = [];


const mockAppContextBase: Partial<AppContextType> = {
  getTripById: jest.fn((id) => id === mockTripBase.id ? mockTripBase : undefined),
  
  // Functions that operate on the mutable lists
  getTripMembers: jest.fn((tripId) => mockTripMembersList.filter(tm => tm.tripId === tripId)),
  tripMembers: mockTripMembersList, // Global list reference
  
  getTripMemberById: jest.fn((id) => mockTripMembersList.find(tm => tm.id === id)),
  
  tripContributions: mockTripContributionsList, // Global list reference
  getTripMemberTotalDirectContribution: jest.fn((memberId) =>
    mockTripContributionsList.filter(tc => tc.tripMemberId === memberId).reduce((sum, tc) => sum + tc.amount, 0)
  ),
  
  tripExpenses: mockTripExpensesList, // Global list reference
  getTripExpenses: jest.fn((tripId) => mockTripExpensesList.filter(te => te.tripId === tripId)),

  // New function for net share calculation
  getTripMemberNetData: jest.fn((tripId, tripMemberId): TripMemberNetData => {
    const member = mockTripMembersList.find(tm => tm.id === tripMemberId && tm.tripId === tripId);
    if (!member) return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };

    const directContribution = mockTripContributionsList
      .filter(tc => tc.tripMemberId === tripMemberId && tc.tripId === tripId)
      .reduce((sum, tc) => sum + tc.amount, 0);

    let shareOfExpenses = 0;
    const expensesForThisTrip = mockTripExpensesList.filter(te => te.tripId === tripId);
    const currentMembersOfThisTrip = mockTripMembersList.filter(tm => tm.tripId === tripId);
    const numMembersInTrip = currentMembersOfThisTrip.length;

    expensesForThisTrip.forEach(expense => {
      if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
        if (expense.splitWithTripMemberIds.includes(tripMemberId)) {
          shareOfExpenses += expense.amount / expense.splitWithTripMemberIds.length;
        }
      } else if (numMembersInTrip > 0) { // Not split, assume shared equally by all in trip
        shareOfExpenses += expense.amount / numMembersInTrip;
      }
    });
    
    const netShare = directContribution - shareOfExpenses;
    return { directContribution, shareOfExpenses, netShare };
  }),

  addTripMember: jest.fn((tripId, data) => {
    const newMember = { ...data, id: `tm-${Date.now()}`, tripId };
    mockTripMembersList.push(newMember);
  }),
  deleteTripMember: jest.fn((memberId) => {
    mockTripMembersList = mockTripMembersList.filter(tm => tm.id !== memberId);
    mockTripContributionsList = mockTripContributionsList.filter(tc => tc.tripMemberId !== memberId);
  }),
  addTripContribution: jest.fn((tripId, memberId, data) => {
    const newContrib = { ...data, id: `tc-${Date.now()}`, tripId, tripMemberId: memberId, date: formatISO(data.date || new Date()) };
    mockTripContributionsList.push(newContrib);
  }),
  addTripExpense: jest.fn((data) => {
    const newExpense = { ...data, id: `te-${Date.now()}` };
    mockTripExpensesList.push(newExpense);
  }),
  categories: INITIAL_CATEGORIES,
  getCategoryById: (id) => INITIAL_CATEGORIES.find(cat => cat.id === id),
};


describe('TripDetailPage', () => {
  const user = userEvent.setup();

  const renderPage = (
    initialMembers: TripMember[] = [],
    initialContributions: TripContribution[] = [],
    initialExpenses: TripExpense[] = []
  ) => {
    // Reset and populate mock lists for each test
    mockTripMembersList = [...initialMembers];
    mockTripContributionsList = [...initialContributions];
    mockTripExpensesList = [...initialExpenses];

    // Ensure the global lists referenced by AppContext are updated
    const currentAppContext = {
      ...mockAppContextBase,
      tripMembers: mockTripMembersList,
      tripContributions: mockTripContributionsList,
      tripExpenses: mockTripExpensesList,
    } as AppContextType;
    
    // Re-mock functions that depend on these lists to use the current state
    currentAppContext.getTripMembers = jest.fn((tripId) => mockTripMembersList.filter(tm => tm.tripId === tripId));
    currentAppContext.getTripMemberById = jest.fn((id) => mockTripMembersList.find(tm => tm.id === id));
    currentAppContext.getTripMemberTotalDirectContribution = jest.fn((memberId) =>
        mockTripContributionsList.filter(tc => tc.tripMemberId === memberId).reduce((sum, tc) => sum + tc.amount, 0)
    );
    currentAppContext.getTripExpenses = jest.fn((tripId) => mockTripExpensesList.filter(te => te.tripId === tripId));
    currentAppContext.getTripMemberNetData = jest.fn((tripId, tripMemberId): TripMemberNetData => {
        const member = mockTripMembersList.find(tm => tm.id === tripMemberId && tm.tripId === tripId);
        if (!member) return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };

        const directContribution = mockTripContributionsList
        .filter(tc => tc.tripMemberId === tripMemberId && tc.tripId === tripId)
        .reduce((sum, tc) => sum + tc.amount, 0);

        let shareOfExpenses = 0;
        const expensesForThisTrip = mockTripExpensesList.filter(te => te.tripId === tripId);
        const currentMembersOfThisTrip = mockTripMembersList.filter(tm => tm.tripId === tripId);
        const numMembersInTrip = currentMembersOfThisTrip.length;

        expensesForThisTrip.forEach(expense => {
        if (expense.isSplit && expense.splitWithTripMemberIds && expense.splitWithTripMemberIds.length > 0) {
            if (expense.splitWithTripMemberIds.includes(tripMemberId)) {
            shareOfExpenses += expense.amount / expense.splitWithTripMemberIds.length;
            }
        } else if (numMembersInTrip > 0) {
            shareOfExpenses += expense.amount / numMembersInTrip;
        }
        });
        const netShare = directContribution - shareOfExpenses;
        return { directContribution, shareOfExpenses, netShare };
    });


    return render(
      <AuthContext.Provider value={{ user: mockAuthUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={currentAppContext}>
          <TripDetailPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockToast.mockClear();
    // Clear mock function calls for add/delete if they are spied on
    (mockAppContextBase.addTripMember as jest.Mock).mockClear();
    (mockAppContextBase.deleteTripMember as jest.Mock).mockClear();
    (mockAppContextBase.addTripContribution as jest.Mock).mockClear();
    (mockAppContextBase.addTripExpense as jest.Mock).mockClear();
  });

  it('renders the page header with trip name and action buttons', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: mockTripBase.name })).toBeInTheDocument();
    expect(screen.getByText(mockTripBase.description!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip member/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to all trips/i })).toBeInTheDocument();
  });

  it('calculates and displays correct trip pot summary (positive balance)', () => {
    const members = [
        { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' },
        { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' },
    ];
    const contributions = [
        { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) },
        { id: 'tc-2', tripId: 'trip-123', tripMemberId: 'tm-bob', amount: 150, date: formatISO(new Date()) },
    ]; // Total: 250
    const expenses = [
        { id: 'te-1', tripId: 'trip-123', description: 'Shared Tent', amount: 50, date: formatISO(new Date()), categoryId: 'travel' },
    ]; // Total: 50
    // Remaining: 200. Pot Usage: (50/250)*100 = 20%
    renderPage(members, contributions, expenses);
    
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Trip Spending
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Remaining in Trip Pot
    expect(screen.getByText(/20% of pot used/i)).toBeInTheDocument();
  });

  it('calculates and displays correct "Net Share in Trip" for each member (positive pot)', async () => {
    const members = [
      { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' },
      { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' },
    ];
    const contributions = [
      { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) },
      { id: 'tc-2', tripId: 'trip-123', tripMemberId: 'tm-bob', amount: 50, date: formatISO(new Date()) },
    ]; // Total Contrib: 150
    const expenses = [
      { id: 'te-1', tripId: 'trip-123', description: 'Tickets', amount: 30, date: formatISO(new Date()), categoryId: 'entertainment' }, // Shared equally: Alice 15, Bob 15
    ]; // Total Spending: 30
    // Alice: Contrib 100, ShareOfExp 15. Net: 85
    // Bob: Contrib 50, ShareOfExp 15. Net: 35
    renderPage(members, contributions, expenses);

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
      
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}100.00`)).toBeInTheDocument(); // Direct contrib
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument(); // Share of exp
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}85.00`)).toBeInTheDocument(); // Net Share

      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Direct contrib
      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}15.00`)).toBeInTheDocument(); // Share of exp
      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}35.00`)).toBeInTheDocument(); // Net Share
    });
  });


  it('calculates and displays correct trip pot summary and net shares (negative balance)', async () => {
    const members = [
        { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' },
        { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' },
    ];
    const contributions = [
        { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 20, date: formatISO(new Date()) },
    ]; // Total Contrib: 20
    const expenses = [
      { id: 'te-1', tripId: 'trip-123', description: 'Big Dinner', amount: 50, date: formatISO(new Date()), categoryId: 'food' }, // Shared: Alice 25, Bob 25
    ]; // Total Spending: 50
    // Remaining Pot: 20 - 50 = -30
    // Alice: Contrib 20, ShareOfExp 25. Net: -5
    // Bob: Contrib 0, ShareOfExp 25. Net: -25
    renderPage(members, contributions, expenses);

    expect(screen.getByText(`${DEFAULT_CURRENCY}20.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Trip Spending
    const remainingPotElement = screen.getByText(`-${DEFAULT_CURRENCY}30.00`); // Remaining in Pot
    expect(remainingPotElement).toHaveClass('text-destructive');
    expect(screen.getByText(/100% of pot used/i)).toBeInTheDocument();

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');

      const aliceNetShareEl = within(aliceCard!).getByText(`-${DEFAULT_CURRENCY}5.00`);
      expect(aliceNetShareEl).toBeInTheDocument();
      expect(aliceNetShareEl).toHaveClass('text-destructive');
      
      const bobNetShareEl = within(bobCard!).getByText(`-${DEFAULT_CURRENCY}25.00`);
      expect(bobNetShareEl).toBeInTheDocument();
      expect(bobNetShareEl).toHaveClass('text-destructive');
    });
  });

  it('calculates net share correctly when expense is split among subset of members', async () => {
    const members = [
      { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' },
      { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' },
      { id: 'tm-charlie', tripId: 'trip-123', name: 'Charlie' },
    ];
    const contributions = [
      { id: 'c1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) },
    ]; // Alice: 100
    const expenses = [
      { id: 'e1', tripId: 'trip-123', description: 'Activity for Alice & Bob', amount: 40, date: formatISO(new Date()), categoryId: 'entertainment', isSplit: true, paidByTripMemberId: 'tm-alice', splitWithTripMemberIds: ['tm-alice', 'tm-bob'] },
      // Alice share: 20, Bob share: 20, Charlie share: 0
    ];
    // Alice: Contrib 100, ShareOfExp 20. Net: 80
    // Bob: Contrib 0, ShareOfExp 20. Net: -20
    // Charlie: Contrib 0, ShareOfExp 0. Net: 0
    renderPage(members, contributions, expenses);

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
      const charlieCard = screen.getByText('Charlie').closest('div[class*="card"]');

      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}80.00`)).toBeInTheDocument();
      expect(within(bobCard!).getByText(`-${DEFAULT_CURRENCY}20.00`)).toHaveClass('text-destructive');
      expect(within(charlieCard!).getByText(`${DEFAULT_CURRENCY}0.00`)).toBeInTheDocument();
    });
  });


  it('calculates net share as equally shared deficit when total contributions are zero and pot is negative', async () => {
    const members = [
      { id: 'tm1', tripId: 'trip-123', name: 'Member1' },
      { id: 'tm2', tripId: 'trip-123', name: 'Member2' },
    ];
    const expenses = [
      { id: 'te-deficit', tripId: 'trip-123', description: 'Unexpected Fee', amount: 100, date: formatISO(new Date()), categoryId: 'other' },
      // Each member's share of expense: 100 / 2 = 50
    ];
    // Member1: Contrib 0, ShareOfExp 50. Net: -50
    // Member2: Contrib 0, ShareOfExp 50. Net: -50
    renderPage(members, [], expenses);

    await waitFor(() => {
      const member1Card = screen.getByText('Member1').closest('div[class*="card"]');
      const member2Card = screen.getByText('Member2').closest('div[class*="card"]');

      const m1NetShare = within(member1Card!).getByText(`-${DEFAULT_CURRENCY}50.00`);
      expect(m1NetShare).toHaveClass('text-destructive');
      const m2NetShare = within(member2Card!).getByText(`-${DEFAULT_CURRENCY}50.00`);
      expect(m2NetShare).toHaveClass('text-destructive');
    });
  });
  
  it('handles deletion of a trip member', async () => {
    const initialMembers = [ { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' }];
    renderPage(initialMembers);
    
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
    if (!bobCard) throw new Error("Bob card not found");

    const optionsButton = bobCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Bob not found");
    await user.click(optionsButton);

    const deleteButton = await screen.findByRole('menuitem', { name: /delete trip member/i });
    await user.click(deleteButton);

    expect(screen.getByRole('alertdialog', { name: /are you sure/i })).toBeInTheDocument();
    expect(screen.getByText(/this will remove the member and their contributions/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockAppContextBase.deleteTripMember).toHaveBeenCalledWith('tm-bob');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Member Deleted" }));
  });

});

// Helper to get elements within a specific scope
import { within } from '@testing-library/react';

