
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '@/app/(app)/reports/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock child components to focus on ReportsPage structure and tab switching
jest.mock('@/components/reports/monthly-spending-trend-chart', () => ({
  MonthlySpendingTrendChart: () => <div data-testid="monthly-spending-chart">Monthly Spending Chart Mock</div>,
}));
jest.mock('@/components/reports/budget-performance-report', () => ({
  BudgetPerformanceReport: () => <div data-testid="budget-performance-report">Budget Performance Report Mock</div>,
}));

const mockUser = { uid: 'test-uid' } as FirebaseUser;

const mockAppContext: Partial<AppContextType> = {
  expenses: [],
  budgetGoals: [],
  categories: [],
};

describe('ReportsPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContext, ...appContextOverrides };
    render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <ReportsPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  it('renders the page header correctly', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /financial reports/i })).toBeInTheDocument();
    expect(screen.getByText(/analyze your spending habits/i)).toBeInTheDocument();
  });

  it('renders tabs for "Spending Trends" and "Budget Performance"', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /spending trends/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /budget performance/i })).toBeInTheDocument();
  });

  it('displays "Spending Trends" content (mocked) by default', () => {
    renderPage();
    expect(screen.getByTestId('monthly-spending-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('budget-performance-report')).not.toBeInTheDocument();
  });

  it('switches to "Budget Performance" tab and displays its content (mocked) when clicked', async () => {
    renderPage();
    const budgetPerformanceTab = screen.getByRole('tab', { name: /budget performance/i });
    await user.click(budgetPerformanceTab);

    expect(screen.getByTestId('budget-performance-report')).toBeInTheDocument();
    expect(screen.queryByTestId('monthly-spending-chart')).not.toBeInTheDocument();
  });

  it('switches back to "Spending Trends" tab when clicked', async () => {
    renderPage();
    // First switch to budget performance
    await user.click(screen.getByRole('tab', { name: /budget performance/i }));
    expect(screen.getByTestId('budget-performance-report')).toBeInTheDocument();

    // Then switch back
    const spendingTrendsTab = screen.getByRole('tab', { name: /spending trends/i });
    await user.click(spendingTrendsTab);
    
    expect(screen.getByTestId('monthly-spending-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('budget-performance-report')).not.toBeInTheDocument();
  });
});
