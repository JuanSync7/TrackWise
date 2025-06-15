
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripDetailPage from '@/app/(app)/trips/[tripId]/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Trip, TripMember, TripContribution, TripExpense, TripMemberNetData, TripSettlement } from '@/lib/types';
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
  name: 'Adventure Base Trip',
  description: 'An exciting adventure!',
  createdAt: formatISO(new Date(2023, 0, 1)),
};

let mockTripMembersList: TripMember[] = [];
let mockTripContributionsList: TripContribution[] = [];
let mockTripExpensesList: TripExpense[] = [];
let mockTripSettlementsMap: Record<string, TripSettlement[]> = {};


const mockAppContextBase: Partial<AppContextType> = {
  getTripById: jest.fn((id) => id === mockTripBase.id ? mockTripBase : undefined),
  
  // --- Dynamic list functions ---
  tripMembers: mockTripMembersList, 
  getTripMembers: jest.fn((tripId) => mockTripMembersList.filter(tm => tm.tripId === tripId)),
  getTripMemberById: jest.fn((id) => mockTripMembersList.find(tm => tm.id === id)),
  
  tripContributions: mockTripContributionsList,
  getTripMemberTotalDirectContribution: jest.fn((memberId, tripIdToFilter) =>
    mockTripContributionsList.filter(tc => tc.tripMemberId === memberId && (!tripIdToFilter || tc.tripId === tripIdToFilter)).reduce((sum, tc) => sum + tc.amount, 0)
  ),
  
  tripExpenses: mockTripExpensesList,
  getTripExpenses: jest.fn((tripId) => mockTripExpensesList.filter(te => te.tripId === tripId)),

  getTripMemberNetData: jest.fn((tripId, tripMemberId): TripMemberNetData => {
    const membersOfThisTrip = mockTripMembersList.filter(tm => tm.tripId === tripId);
    const memberExistsInTrip = membersOfThisTrip.some(tm => tm.id === tripMemberId);
    if (!memberExistsInTrip) return { directContribution: 0, shareOfExpenses: 0, netShare: 0 };

    const directContribution = mockTripContributionsList
      .filter(tc => tc.tripMemberId === tripMemberId && tc.tripId === tripId)
      .reduce((sum, tc) => sum + tc.amount, 0);

    let shareOfExpenses = 0;
    const expensesForThisTrip = mockTripExpensesList.filter(te => te.tripId === tripId);
    const numMembersInTrip = membersOfThisTrip.length;

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
  }),

  getTripSettlements: jest.fn((tripId) => mockTripSettlementsMap[tripId] || []),
  
  triggerTripSettlementCalculation: jest.fn((tripId) => {
    const currentTripMembers = mockTripMembersList.filter(tm => tm.tripId === tripId);
    if (currentTripMembers.length === 0) {
        mockTripSettlementsMap[tripId] = [];
        return;
    }

    const memberNetShares: { id: string; netShare: number }[] = currentTripMembers.map(member => ({
        id: member.id,
        netShare: (mockAppContextBase.getTripMemberNetData as jest.Mock)(tripId, member.id).netShare,
    }));

    let debtors = memberNetShares.filter(m => m.netShare < -0.005).map(m => ({ id: m.id, amount: Math.abs(m.netShare) }));
    let creditors = memberNetShares.filter(m => m.netShare > 0.005).map(m => ({ id: m.id, amount: m.netShare }));
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlementsForTrip: TripSettlement[] = [];
    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
        const debtor = debtors[debtorIdx];
        const creditor = creditors[creditorIdx];
        const transferAmount = Math.min(debtor.amount, creditor.amount);

        if (transferAmount > 0.005) {
            settlementsForTrip.push({
                id: `settlement-${Date.now()}-${Math.random()}`, tripId,
                owedByTripMemberId: debtor.id, owedToTripMemberId: creditor.id, amount: transferAmount,
            });
            debtor.amount -= transferAmount;
            creditor.amount -= transferAmount;
        }
        if (debtor.amount <= 0.005) debtorIdx++;
        if (creditor.amount <= 0.005) creditorIdx++;
    }
    mockTripSettlementsMap[tripId] = settlementsForTrip;
  }),


  addTripMember: jest.fn((tripId, data) => {
    const newMember = { ...data, id: `tm-${Date.now()}`, tripId };
    mockTripMembersList.push(newMember);
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock)(tripId);
  }),
  deleteTripMember: jest.fn((memberId, tripId) => {
    mockTripMembersList = mockTripMembersList.filter(tm => tm.id !== memberId);
    mockTripContributionsList = mockTripContributionsList.filter(tc => tc.tripMemberId !== memberId);
    mockTripExpensesList = mockTripExpensesList.map(exp => {
      if (exp.tripId === tripId) {
        const newSplitWith = exp.splitWithTripMemberIds?.filter(id => id !== memberId);
        return { ...exp, paidByTripMemberId: exp.paidByTripMemberId === memberId ? undefined : exp.paidByTripMemberId, splitWithTripMemberIds: newSplitWith, isSplit: newSplitWith && newSplitWith.length > 0 ? exp.isSplit : false };
      }
      return exp;
    });
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock)(tripId);
  }),
  addTripContribution: jest.fn((tripId, memberId, data) => {
    const newContrib = { ...data, id: `tc-${Date.now()}`, tripId, tripMemberId: memberId, date: formatISO(data.date || new Date()) };
    mockTripContributionsList.push(newContrib);
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock)(tripId);
  }),
  addTripExpense: jest.fn((data) => {
    const newExpense = { ...data, id: `te-${Date.now()}` };
    mockTripExpensesList.push(newExpense);
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock)(data.tripId);
  }),
  categories: INITIAL_CATEGORIES,
  getCategoryById: (id) => INITIAL_CATEGORIES.find(cat => cat.id === id),
};


describe('TripDetailPage', () => {
  const user = userEvent.setup();

  const renderPage = (
    tripData: Partial<Trip> = {},
    initialMembers: TripMember[] = [],
    initialContributions: TripContribution[] = [],
    initialExpenses: TripExpense[] = []
  ) => {
    mockTripBase.name = tripData.name || "Adventure Test Trip";
    mockTripBase.description = tripData.description;
    mockTripMembersList = [...initialMembers];
    mockTripContributionsList = [...initialContributions];
    mockTripExpensesList = [...initialExpenses];
    mockTripSettlementsMap = {}; // Reset settlements map
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock)(mockTripBase.id); // Initial calculation

    const currentAppContext = {
      ...mockAppContextBase,
    } as AppContextType;
    
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
    (mockAppContextBase.addTripMember as jest.Mock).mockClear();
    (mockAppContextBase.deleteTripMember as jest.Mock).mockClear();
    (mockAppContextBase.addTripContribution as jest.Mock).mockClear();
    (mockAppContextBase.addTripExpense as jest.Mock).mockClear();
    (mockAppContextBase.triggerTripSettlementCalculation as jest.Mock).mockClear();
  });

  it('renders the page header with trip name and action buttons', () => {
    renderPage({name: "My Grand Tour"});
    expect(screen.getByRole('heading', { name: "My Grand Tour" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip member/i })).toBeInTheDocument();
  });

  it('calculates and displays correct trip pot summary (positive balance)', () => {
    const members = [ { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' }, { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' }];
    const contributions = [
        { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) },
        { id: 'tc-2', tripId: 'trip-123', tripMemberId: 'tm-bob', amount: 150, date: formatISO(new Date()) },
    ]; // Total: 250
    const expenses = [ { id: 'te-1', tripId: 'trip-123', description: 'Shared Tent', amount: 50, date: formatISO(new Date()), categoryId: 'travel' }]; // Total: 50
    renderPage({}, members, contributions, expenses);
    
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Trip Spending
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Remaining in Trip Pot
    expect(screen.getByText(/20% of pot used/i)).toBeInTheDocument();
  });

  it('calculates and displays correct "Net Share in Trip" for each member (positive pot)', async () => {
    const members = [ { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' }, { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' }];
    const contributions = [
      { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) },
      { id: 'tc-2', tripId: 'trip-123', tripMemberId: 'tm-bob', amount: 50, date: formatISO(new Date()) },
    ]; 
    const expenses = [ { id: 'te-1', tripId: 'trip-123', description: 'Tickets', amount: 30, date: formatISO(new Date()), categoryId: 'entertainment' }]; 
    renderPage({}, members, contributions, expenses);

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
      
      // Alice: Contrib 100, ShareOfExp 15. Net: 85
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}100.00`)).toBeInTheDocument(); // Direct contrib
      expect(within(aliceCard!).getByText(/share of expenses: \$15\.00/i)).toBeInTheDocument();
      expect(within(aliceCard!).getByText(`${DEFAULT_CURRENCY}85.00`)).toBeInTheDocument(); // Net Share

      // Bob: Contrib 50, ShareOfExp 15. Net: 35
      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Direct contrib
      expect(within(bobCard!).getByText(/share of expenses: \$15\.00/i)).toBeInTheDocument();
      expect(within(bobCard!).getByText(`${DEFAULT_CURRENCY}35.00`)).toBeInTheDocument(); // Net Share
    });
  });


  it('calculates trip pot summary and net shares (negative balance)', async () => {
    const members = [ { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' }, { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' }];
    const contributions = [ { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 20, date: formatISO(new Date()) }]; 
    const expenses = [ { id: 'te-1', tripId: 'trip-123', description: 'Big Dinner', amount: 50, date: formatISO(new Date()), categoryId: 'food' }]; 
    renderPage({}, members, contributions, expenses);

    expect(screen.getByText(`${DEFAULT_CURRENCY}20.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Trip Spending
    const remainingPotElement = screen.getByText(`-${DEFAULT_CURRENCY}30.00`); 
    expect(remainingPotElement).toHaveClass('text-destructive');
    expect(screen.getByText(/100% of pot used/i)).toBeInTheDocument();

    await waitFor(() => {
      const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
      const bobCard = screen.getByText('Bob').closest('div[class*="card"]');

      // Alice: Contrib 20, ShareOfExp 25. Net: -5
      const aliceNetShareEl = within(aliceCard!).getByText(`-${DEFAULT_CURRENCY}5.00`);
      expect(aliceNetShareEl).toHaveClass('text-destructive');
      
      // Bob: Contrib 0, ShareOfExp 25. Net: -25
      const bobNetShareEl = within(bobCard!).getByText(`-${DEFAULT_CURRENCY}25.00`);
      expect(bobNetShareEl).toHaveClass('text-destructive');
    });
  });

  it('calculates "Net Share in Trip Pot" when member contributes $0 and pot goes negative', async () => {
    const members = [ { id: 'tm1', tripId: 'trip-123', name: 'ZeroDollarMember' }, { id: 'tm2', tripId: 'trip-123', name: 'PayerMember' }];
    const contributions = [ { id: 'c-payer', tripId: 'trip-123', tripMemberId: 'tm2', amount: 10, date: formatISO(new Date()) }]; // Payer contributes 10
    const expenses = [ { id: 'e-big', tripId: 'trip-123', description: 'Costly Item', amount: 40, date: formatISO(new Date()), categoryId: 'other' }]; // Cost 40, Pot = 10-40 = -30
    // ZeroDollarMember: Contrib 0, ShareOfExp 20. Net = -20
    // PayerMember: Contrib 10, ShareOfExp 20. Net = -10
    renderPage({}, members, contributions, expenses);

    await waitFor(() => {
      const zeroMemberCard = screen.getByText('ZeroDollarMember').closest('div[class*="card"]');
      const payerMemberCard = screen.getByText('PayerMember').closest('div[class*="card"]');
      
      const zeroNetShare = within(zeroMemberCard!).getByText(`-${DEFAULT_CURRENCY}20.00`);
      expect(zeroNetShare).toBeInTheDocument();
      expect(zeroNetShare).toHaveClass('text-destructive');

      const payerNetShare = within(payerMemberCard!).getByText(`-${DEFAULT_CURRENCY}10.00`);
      expect(payerNetShare).toBeInTheDocument();
      expect(payerNetShare).toHaveClass('text-destructive');
    });
  });
  
  it('handles deletion of a trip member and updates calculations', async () => {
    const initialMembers = [ { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' }, { id: 'tm-carol', tripId: 'trip-123', name: 'Carol'} ];
    renderPage({}, initialMembers);
    
    expect(screen.getByText('Bob')).toBeInTheDocument();
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
    const optionsButton = within(bobCard!).getByRole('button', { name: /trip member options/i });
    await user.click(optionsButton);
    await user.click(await screen.findByRole('menuitem', { name: /delete trip member/i }));
    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockAppContextBase.deleteTripMember).toHaveBeenCalledWith('tm-bob', 'trip-123');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Member Deleted" }));
    // Add checks for updated pot summary if necessary
  });

  it('displays "Who Owes Whom" settlements correctly', async () => {
    const members = [
        { id: 'tm-alice', tripId: 'trip-123', name: 'Alice' }, // Creditor
        { id: 'tm-bob', tripId: 'trip-123', name: 'Bob' },     // Debtor
        { id: 'tm-charlie', tripId: 'trip-123', name: 'Charlie' },// Debtor
    ];
    const contributions = [
        { id: 'c1', tripId: 'trip-123', tripMemberId: 'tm-alice', amount: 100, date: formatISO(new Date()) }, // Alice +100
    ];
    const expenses = [
        { id: 'e1', tripId: 'trip-123', description: 'Meal', amount: 60, date: formatISO(new Date()), categoryId: 'food', isSplit: true, splitWithTripMemberIds: ['tm-alice', 'tm-bob', 'tm-charlie']}, 
        // Each share 20. Alice: 100-20 = +80. Bob: 0-20 = -20. Charlie: 0-20 = -20.
        // Expected: Bob owes Alice 20, Charlie owes Alice 20.
    ];
    renderPage({ name: "Settlement Test Trip"}, members, contributions, expenses);

    await waitFor(() => {
        expect(screen.getByText("Trip Settlement")).toBeInTheDocument();
        // Check Bob owes Alice
        const bobOwesAlice = screen.getAllByText(/bob/i).find(el => el.closest('.flex')?.textContent?.includes('owes Alice'));
        expect(bobOwesAlice).toBeInTheDocument();
        expect(bobOwesAlice!.closest('.flex')).toHaveTextContent(`${DEFAULT_CURRENCY}20.00`);
        
        // Check Charlie owes Alice
        const charlieOwesAlice = screen.getAllByText(/charlie/i).find(el => el.closest('.flex')?.textContent?.includes('owes Alice'));
        expect(charlieOwesAlice).toBeInTheDocument();
        expect(charlieOwesAlice!.closest('.flex')).toHaveTextContent(`${DEFAULT_CURRENCY}20.00`);
    });
  });

  it('displays "All Square!" when no settlements are needed', async () => {
    const members = [{ id: 'tm-dave', tripId: 'trip-123', name: 'Dave' }];
    const contributions = [{ id: 'c1', tripId: 'trip-123', tripMemberId: 'tm-dave', amount: 50, date: formatISO(new Date()) }];
    const expenses = [{ id: 'e1', tripId: 'trip-123', description: 'Solo Item', amount: 50, date: formatISO(new Date()), categoryId: 'shopping', isSplit: true, splitWithTripMemberIds: ['tm-dave'] }];
    // Dave: 50 - 50 = 0.
    renderPage({name: "All Square Trip"}, members, contributions, expenses);

    await waitFor(() => {
        expect(screen.getByText("Trip Settlement")).toBeInTheDocument();
        expect(screen.getByText("All Square!")).toBeInTheDocument();
    });
  });

});
