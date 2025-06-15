
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripDetailPage from '@/app/(app)/trips/[tripId]/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Trip, TripMember, TripContribution, TripExpense } from '@/lib/types';
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

const mockTripMembersBase: TripMember[] = [
  { id: 'tm-1', tripId: 'trip-123', name: 'Alice' },
  { id: 'tm-2', tripId: 'trip-123', name: 'Bob' },
  { id: 'tm-auth-user', tripId: 'trip-123', name: 'Auth User'}, // Current user as a trip member
];

const mockTripContributionsBase: TripContribution[] = [
  { id: 'tc-1', tripId: 'trip-123', tripMemberId: 'tm-1', amount: 100, date: formatISO(new Date(2023, 0, 2)), notes: 'Alice first contrib' },
  { id: 'tc-2', tripId: 'trip-123', tripMemberId: 'tm-2', amount: 150, date: formatISO(new Date(2023, 0, 3)), notes: 'Bob first contrib' },
];

const mockTripExpensesBase: TripExpense[] = [
  { id: 'te-1', tripId: 'trip-123', description: 'Shared Tent', amount: 50, date: formatISO(new Date(2023, 0, 4)), categoryId: 'travel' },
];

const mockAppContextBase: Partial<AppContextType> = {
  getTripById: jest.fn().mockReturnValue(mockTripBase),
  getTripMembers: jest.fn().mockReturnValue(mockTripMembersBase),
  tripMembers: mockTripMembersBase, // Global list
  tripContributions: mockTripContributionsBase, // Global list
  tripExpenses: mockTripExpensesBase, // Global list
  getTripMemberById: jest.fn((id) => mockTripMembersBase.find(tm => tm.id === id)),
  getTripMemberTotalDirectContribution: jest.fn((memberId) =>
    mockTripContributionsBase.filter(tc => tc.tripMemberId === memberId).reduce((sum, tc) => sum + tc.amount, 0)
  ),
  getTripExpenses: jest.fn().mockReturnValue(mockTripExpensesBase),
  addTripMember: jest.fn(),
  deleteTripMember: jest.fn(),
  addTripContribution: jest.fn(),
  addTripExpense: jest.fn(),
  categories: INITIAL_CATEGORIES,
  getCategoryById: (id) => INITIAL_CATEGORIES.find(cat => cat.id === id),
};


describe('TripDetailPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    const currentTripMembers = appContextOverrides.tripMembers || [...mockTripMembersBase];
    const currentTripContributions = appContextOverrides.tripContributions || [...mockTripContributionsBase];
    const currentTripExpenses = appContextOverrides.tripExpenses || [...mockTripExpensesBase];


    // Reset mocks for each test
    (mockAppContextBase.getTripById as jest.Mock).mockReturnValue(appContextOverrides.getTripById ? appContextOverrides.getTripById('trip-123') : mockTripBase);
    (mockAppContextBase.getTripMembers as jest.Mock).mockReturnValue(currentTripMembers);
    (mockAppContextBase.getTripMemberTotalDirectContribution as jest.Mock).mockImplementation((memberId) =>
        currentTripContributions
        .filter(tc => tc.tripMemberId === memberId)
        .reduce((sum, tc) => sum + tc.amount, 0)
    );
    (mockAppContextBase.getTripExpenses as jest.Mock).mockReturnValue(currentTripExpenses);

    const finalAppContext: AppContextType = {
      ...mockAppContextBase,
      ...appContextOverrides,
      tripMembers: currentTripMembers,
      tripContributions: currentTripContributions,
      tripExpenses: currentTripExpenses,
    } as AppContextType;

    return render(
      <AuthContext.Provider value={{ user: mockAuthUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext}>
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
  });

  it('renders the page header with trip name and action buttons', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: mockTripBase.name })).toBeInTheDocument();
    expect(screen.getByText(mockTripBase.description!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip expense/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add trip member/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to all trips/i })).toBeInTheDocument();
  });

  it('renders list of trip members', () => {
    renderPage();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('opens "Add Trip Member" dialog and calls addTripMember on save', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /add trip member/i }));
    expect(screen.getByRole('dialog', { name: /add new trip member/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/member name/i), 'Charlie');
    await user.click(screen.getByRole('button', { name: /add trip member/i }));

    expect(mockAppContextBase.addTripMember).toHaveBeenCalledWith(mockTripBase.id, { name: 'Charlie' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Member Added" }));
  });

  it('opens "Add Trip Contribution" dialog and calls addTripContribution on save', async () => {
    renderPage();
    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    if (!aliceCard) throw new Error("Alice card not found");

    const optionsButton = aliceCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Alice not found");
    await user.click(optionsButton);

    const addContributionButton = await screen.findByRole('menuitem', { name: /add trip contribution/i });
    await user.click(addContributionButton);

    expect(screen.getByRole('dialog', { name: /add contribution for alice/i })).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/contribution amount/i));
    await user.type(screen.getByLabelText(/contribution amount/i), '50');

    await user.click(screen.getByRole('button', { name: /save trip contribution/i }));

    expect(mockAppContextBase.addTripContribution).toHaveBeenCalledWith(mockTripBase.id, 'tm-1', expect.objectContaining({
      amount: 50,
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Contribution Added" }));
  });

  it('opens "Add Trip Expense" dialog and calls addTripExpense on save', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /add trip expense/i }));
    expect(screen.getByRole('dialog', { name: /add new trip expense/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/description/i), 'Park Tickets');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '120');
    // Select category
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(INITIAL_CATEGORIES.find(c=>c.id === 'entertainment')!.name));
    
    // Check default split behavior
    expect(screen.getByLabelText(/split this expense/i)).toBeChecked();
    // Assuming Alice, Bob, Auth User are currentTripMembers
    expect(screen.getByRole('checkbox', { name: 'Alice'})).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Bob'})).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Auth User'})).toBeChecked();


    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(mockAppContextBase.addTripExpense).toHaveBeenCalledWith(expect.objectContaining({
      tripId: mockTripBase.id,
      description: 'Park Tickets',
      amount: 120,
      categoryId: 'entertainment',
      isSplit: true,
      paidByTripMemberId: 'tm-auth-user', // Defaulted to current user if member
      splitWithTripMemberIds: ['tm-1', 'tm-2', 'tm-auth-user']
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Expense Added" }));
  });

  it('calculates and displays correct trip pot summary (positive balance)', () => {
    // Alice: 100, Bob: 150. Auth User: 0. Total Contributions: 250
    // Shared Tent Expense: 50. Total Spending: 50
    // Remaining in Pot: 250 - 50 = 200
    renderPage(); // Uses mockAppContextBase defaults
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Total Trip Spending
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Remaining in Trip Pot
    expect(screen.getByText(/20% of pot used/i)).toBeInTheDocument(); // (50/250)*100
  });

  it('calculates and displays correct "Net Share in Trip Pot" for each member (positive pot balance)', () => {
    // Pot: 200. Alice contributed 100/250 = 40%. Bob contributed 150/250 = 60%.
    // Auth User: 0/250 = 0%
    // Alice share: 0.40 * 200 = 80
    // Bob share: 0.60 * 200 = 120
    // Auth User share: 0 * 200 = 0
    renderPage();
    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
    const authUserCard = screen.getByText('Auth User').closest('div[class*="card"]');


    expect(aliceCard).toHaveTextContent(`Net Share in Trip Pot:${DEFAULT_CURRENCY}80.00`);
    expect(bobCard).toHaveTextContent(`Net Share in Trip Pot:${DEFAULT_CURRENCY}120.00`);
    expect(authUserCard).toHaveTextContent(`Net Share in Trip Pot:${DEFAULT_CURRENCY}0.00`); // Auth user hasn't contributed yet
  });

  it('calculates and displays correct trip pot summary (negative balance)', () => {
    const highExpenses: TripExpense[] = [
      { id: 'te-high', tripId: 'trip-123', description: 'Emergency Repair', amount: 300, date: formatISO(new Date()), categoryId: 'other' },
    ];
    // Total Contributions: 250 (Alice 100, Bob 150 from mockTripContributionsBase)
    // Total Spending: 300 (from highExpenses override)
    // Remaining in Pot: 250 - 300 = -50
    renderPage({ tripExpenses: highExpenses, tripContributions: mockTripContributionsBase, tripMembers: mockTripMembersBase });
    expect(screen.getByText(`${DEFAULT_CURRENCY}250.00`)).toBeInTheDocument(); // Total Contributions
    expect(screen.getByText(`${DEFAULT_CURRENCY}300.00`)).toBeInTheDocument(); // Total Trip Spending
    expect(screen.getByText(`-${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Remaining in Pot (negative)
    expect(screen.getByText(/100% of pot used/i)).toBeInTheDocument(); // (300/250)*100, capped at 100 if spending > contributions

    const remainingPotElement = screen.getByText(`-${DEFAULT_CURRENCY}50.00`);
    expect(remainingPotElement).toHaveClass('text-destructive');
  });

  it('calculates "Net Share in Trip Pot" as equally shared deficit when total contributions are zero and pot is negative', () => {
    const tripMembers: TripMember[] = [
      { id: 'tm1', tripId: 'trip-123', name: 'Member1' },
      { id: 'tm2', tripId: 'trip-123', name: 'Member2' },
    ];
    const tripExpenses: TripExpense[] = [
      { id: 'te-deficit', tripId: 'trip-123', description: 'Unexpected Fee', amount: 100, date: formatISO(new Date()), categoryId: 'other' },
    ];
    // Total Contributions: 0
    // Total Spending: 100
    // Remaining in Pot: -100
    // Each member's share: -100 / 2 = -50
    renderPage({
      tripMembers: tripMembers,
      tripContributions: [], // No contributions
      tripExpenses: tripExpenses,
      getTripMemberTotalDirectContribution: () => 0, // Ensure this returns 0 for all members
    });

    const member1Card = screen.getByText('Member1').closest('div[class*="card"]');
    const member2Card = screen.getByText('Member2').closest('div[class*="card"]');

    expect(member1Card).toHaveTextContent(`Net Share in Trip Pot:-${DEFAULT_CURRENCY}50.00`);
    expect(member2Card).toHaveTextContent(`Net Share in Trip Pot:-${DEFAULT_CURRENCY}50.00`);

    const member1ShareElement = within(member1Card!).getByText(`-${DEFAULT_CURRENCY}50.00`);
    expect(member1ShareElement).toHaveClass('text-destructive');
    const member2ShareElement = within(member2Card!).getByText(`-${DEFAULT_CURRENCY}50.00`);
    expect(member2ShareElement).toHaveClass('text-destructive');
  });


  it('calculates and displays correct "Net Share in Trip Pot" for each member (negative pot balance)', () => {
    const highExpenses: TripExpense[] = [
      { id: 'te-high', tripId: 'trip-123', description: 'Emergency Repair', amount: 300, date: formatISO(new Date()), categoryId: 'other' },
    ];
    // Pot: -50. Alice contributed 100/250 = 40%. Bob contributed 150/250 = 60%. Auth User: 0%
    // Alice share: 0.40 * -50 = -20
    // Bob share: 0.60 * -50 = -30
    // Auth User share: 0 * -50 = 0 (still 0 as they didn't contribute)
    renderPage({ tripExpenses: highExpenses, tripContributions: mockTripContributionsBase, tripMembers: mockTripMembersBase });

    const aliceCard = screen.getByText('Alice').closest('div[class*="card"]');
    const bobCard = screen.getByText('Bob').closest('div[class*="card"]');
    const authUserCard = screen.getByText('Auth User').closest('div[class*="card"]');

    expect(aliceCard).toHaveTextContent(`Net Share in Trip Pot:-${DEFAULT_CURRENCY}20.00`);
    expect(bobCard).toHaveTextContent(`Net Share in Trip Pot:-${DEFAULT_CURRENCY}30.00`);
    expect(authUserCard).toHaveTextContent(`Net Share in Trip Pot:${DEFAULT_CURRENCY}0.00`);

    const aliceShareElement = within(aliceCard!).getByText(`-${DEFAULT_CURRENCY}20.00`);
    expect(aliceShareElement).toHaveClass('text-destructive');
    const bobShareElement = within(bobCard!).getByText(`-${DEFAULT_CURRENCY}30.00`);
    expect(bobShareElement).toHaveClass('text-destructive');
     const authUserShareElement = within(authUserCard!).getByText(`${DEFAULT_CURRENCY}0.00`); // Should not be destructive
    expect(authUserShareElement).not.toHaveClass('text-destructive');
    // expect(authUserShareElement).toHaveClass('text-accent'); // Or default color if 0 // Default color will not have text-accent
  });

  it('handles deletion of a trip member', async () => {
    renderPage();
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

    expect(mockAppContextBase.deleteTripMember).toHaveBeenCalledWith('tm-2'); // Bob's ID
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Trip Member Deleted" }));
  });

  it('correctly determines current logged-in user as trip member for default payer in expense form', async () => {
    // Ensure 'Auth User' is a trip member (tm-auth-user)
    renderPage();

    await user.click(screen.getByRole('button', { name: /add trip expense/i }));

    // Click the "Split this expense" checkbox
    const splitCheckbox = screen.getByLabelText(/split this expense/i);
    // It should already be checked by default for new expenses
    expect(splitCheckbox).toBeChecked();


    // Check if "Auth User" is selected as the payer by default
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /select member who paid/i })).toHaveTextContent('Auth User');
    });
  });
});

// Helper to get elements within a specific scope
import { within } from '@testing-library/react';
