
import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(app)/dashboard/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { DEFAULT_CURRENCY, INITIAL_CATEGORIES } from '@/lib/constants';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode, href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
} as FirebaseUser;

const mockExpenses = [
  { id: '1', description: 'Coffee', amount: 3, date: new Date().toISOString(), categoryId: 'food', notes: '' },
  { id: '2', description: 'Lunch', amount: 15, date: new Date().toISOString(), categoryId: 'food', notes: '' },
];

const mockBudgetGoals = [
  { id: 'bg1', categoryId: 'food', amount: 200, currentSpending: 18, period: 'monthly' as const },
];

const mockAppContext: Partial<AppContextType> = {
  expenses: mockExpenses,
  budgetGoals: mockBudgetGoals,
  categories: INITIAL_CATEGORIES,
  getCategoryById: (id) => INITIAL_CATEGORIES.find(cat => cat.id === id),
  // Add other necessary mock functions/data if DashboardPage uses them
  // For example, if it directly calls functions to calculate totals,
  // those might need to be part of this mock or the component refactored to receive props.
  // For now, assuming totals are derived within the component or simple reducers on props.
};


describe('DashboardPage', () => {
  beforeEach(() => {
    // IntersectionObserver isn't available in test environment
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  const renderDashboard = (appContextOverrides: Partial<AppContextType> = {}) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={{ ...mockAppContext, ...appContextOverrides } as AppContextType}>
          <DashboardPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  it('renders the page header with title and description', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /welcome to trackwise!/i })).toBeInTheDocument();
    expect(screen.getByText(/here's your financial overview./i)).toBeInTheDocument();
  });

  it('renders the "Add Expense" button in the header', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: /add expense/i })).toBeInTheDocument();
  });

  it('renders all summary cards with titles', () => {
    renderDashboard();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Total Budget')).toBeInTheDocument();
    expect(screen.getByText('Remaining Budget')).toBeInTheDocument();
    expect(screen.getByText('Average Transaction')).toBeInTheDocument();
  });

  it('displays correct total expenses value', () => {
    renderDashboard();
    // Sum of mockExpenses: 3 + 15 = 18
    expect(screen.getByText(`${DEFAULT_CURRENCY}18.00`)).toBeInTheDocument();
  });

  it('displays correct total budget value', () => {
    renderDashboard();
    // Sum of mockBudgetGoals: 200
    expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument();
  });
  
  it('renders the SpendingChart and BudgetGoalPieChart sections', () => {
    renderDashboard();
    // These are often complex; we're checking for their card titles or a known element within them
    expect(screen.getByText(/spending overview/i)).toBeInTheDocument();
    expect(screen.getByText(/budget allocations/i)).toBeInTheDocument();
  });

  it('shows empty state for charts if no data', () => {
    renderDashboard({ expenses: [], budgetGoals: [] });
    expect(screen.getByText(/no expense data yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no budget goals set yet/i)).toBeInTheDocument();
  });
});
