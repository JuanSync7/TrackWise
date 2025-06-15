
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(app)/dashboard/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Expense, BudgetGoal } from '@/lib/types';
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

const mockExpenses: Expense[] = [
  { id: '1', description: 'Coffee', amount: 3, date: new Date(2023, 0, 15).toISOString(), categoryId: 'food', notes: '' },
  { id: '2', description: 'Lunch', amount: 15, date: new Date(2023, 0, 16).toISOString(), categoryId: 'food', notes: '' },
];

const mockBudgetGoals: BudgetGoal[] = [
  { id: 'bg1', categoryId: 'food', amount: 200, currentSpending: 18, period: 'monthly' as const },
];

const mockAppContextBase: Partial<AppContextType> = {
  expenses: mockExpenses,
  budgetGoals: mockBudgetGoals,
  categories: INITIAL_CATEGORIES,
  getCategoryById: (id) => INITIAL_CATEGORIES.find(cat => cat.id === id),
};


describe('DashboardPage', () => {
  beforeEach(() => {
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
    // Reset mocks for each test
    (mockAppContextBase.expenses as Expense[]) = [...mockExpenses];
  });

  const renderDashboard = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
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
    expect(screen.getByText('Total Personal Budget')).toBeInTheDocument();
    expect(screen.getByText('Remaining Personal Budget')).toBeInTheDocument();
    expect(screen.getByText('Average Transaction')).toBeInTheDocument();
  });

  it('displays correct total expenses value', async () => {
    renderDashboard();
    await waitFor(() => {
        // Sum of mockExpenses: 3 + 15 = 18
        expect(screen.getByText(`${DEFAULT_CURRENCY}18.00`)).toBeInTheDocument();
    });
  });

  it('displays correct total personal budget value', async () => {
    renderDashboard();
    await waitFor(() => {
        // Sum of mockBudgetGoals: 200
        expect(screen.getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument();
    });
  });
  
  it('displays correct remaining personal budget value', async () => {
    renderDashboard();
    // Remaining: 200 (budget) - 18 (expenses) = 182
    await waitFor(() => {
        expect(screen.getByText(`${DEFAULT_CURRENCY}182.00`)).toBeInTheDocument();
    });
  });

  it('displays correct average transaction value', async () => {
    renderDashboard();
    // Average: (3+15)/2 = 9
    await waitFor(() => {
        expect(screen.getByText(`${DEFAULT_CURRENCY}9.00`)).toBeInTheDocument();
    });
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

  it('displays "Spending up" trend when last expense is higher than second last', async () => {
    const trendingUpExpenses: Expense[] = [
      { id: 'exp1', description: 'Old', amount: 10, date: new Date(2023,0,1).toISOString(), categoryId: 'food' },
      { id: 'exp2', description: 'New', amount: 20, date: new Date(2023,0,2).toISOString(), categoryId: 'food' },
    ];
    renderDashboard({ expenses: trendingUpExpenses });
    await waitFor(() => {
      expect(screen.getByText(/spending up/i)).toBeInTheDocument();
    });
  });

  it('displays "Spending down" trend when last expense is lower than second last', async () => {
    const trendingDownExpenses: Expense[] = [
      { id: 'exp1', description: 'Old', amount: 20, date: new Date(2023,0,1).toISOString(), categoryId: 'food' },
      { id: 'exp2', description: 'New', amount: 10, date: new Date(2023,0,2).toISOString(), categoryId: 'food' },
    ];
    renderDashboard({ expenses: trendingDownExpenses });
    await waitFor(() => {
      expect(screen.getByText(/spending down/i)).toBeInTheDocument();
    });
  });
  
  it('displays no trend if only one expense or amounts are equal', async () => {
    const singleExpense: Expense[] = [
      { id: 'exp1', description: 'Old', amount: 10, date: new Date(2023,0,1).toISOString(), categoryId: 'food' },
    ];
    const { rerender } = renderDashboard({ expenses: singleExpense });
    await waitFor(() => {
        expect(screen.queryByText(/spending up/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/spending down/i)).not.toBeInTheDocument();
    });

    const equalExpenses: Expense[] = [
        { id: 'exp1', description: 'Old', amount: 10, date: new Date(2023,0,1).toISOString(), categoryId: 'food' },
        { id: 'exp2', description: 'New', amount: 10, date: new Date(2023,0,2).toISOString(), categoryId: 'food' },
    ];
    // Manually construct context for rerender as it's not a direct prop change
    const newAppContext = { ...mockAppContextBase, expenses: equalExpenses } as AppContextType;
    rerender(
        <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
            <AppContext.Provider value={newAppContext}>
            <DashboardPage />
            </AppContext.Provider>
        </AuthContext.Provider>
    );
     await waitFor(() => {
        expect(screen.queryByText(/spending up/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/spending down/i)).not.toBeInTheDocument();
    });
  });
});
