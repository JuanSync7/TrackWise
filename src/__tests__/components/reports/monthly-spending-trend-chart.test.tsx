
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlySpendingTrendChart } from '@/components/reports/monthly-spending-trend-chart';
import { AppContext } from '@/contexts/app-context';
import type { AppContextType, Expense } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Mock Recharts to prevent actual chart rendering during tests
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children, data }: { children: React.ReactNode, data: any[] }) => (
      <div data-testid="line-chart" data-chartdata={JSON.stringify(data)}>{children}</div>
    ),
    // Mock other Recharts components used if necessary (XAxis, YAxis, Tooltip, etc.)
    // For now, we'll mainly check the data passed to LineChart
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    CartesianGrid: () => <div data-testid="cartesiangrid" />,
    Line: () => <div data-testid="line" />,
  };
});

const mockExpensesBase: Expense[] = []; // Start with empty

const mockAppContextBase: Partial<AppContextType> = {
  expenses: mockExpensesBase,
};

describe('MonthlySpendingTrendChart', () => {
  const user = userEvent.setup();
  const today = new Date();

  const renderChart = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    render(
      <AppContext.Provider value={finalAppContext as AppContextType}>
        <MonthlySpendingTrendChart />
      </AppContext.Provider>
    );
  };

  it('renders the card title and description', () => {
    renderChart();
    expect(screen.getByText('Monthly Spending Trends')).toBeInTheDocument();
    expect(screen.getByText('View your total spending over selected periods.')).toBeInTheDocument();
  });

  it('renders the period selector, defaulting to "Last 6 Months"', () => {
    renderChart();
    expect(screen.getByRole('combobox')).toHaveTextContent('Last 6 Months');
  });

  it('shows an empty state message if there are no expenses', () => {
    renderChart({ expenses: [] });
    expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('processes and passes correct data to LineChart for "Last 6 Months"', () => {
    const expenses: Expense[] = [
      // Current month
      { id: '1', description: 'exp1', amount: 100, date: today.toISOString(), categoryId: 'food' },
      // Last month
      { id: '2', description: 'exp2', amount: 50, date: subMonths(today, 1).toISOString(), categoryId: 'food' },
      // 5 months ago
      { id: '3', description: 'exp3', amount: 75, date: subMonths(today, 5).toISOString(), categoryId: 'food' },
       // 6 months ago (should not be included by default "last 6 months" which means current + 5 previous)
      { id: '4', description: 'exp4', amount: 200, date: subMonths(today, 6).toISOString(), categoryId: 'food' },
    ];
    renderChart({ expenses });

    const lineChartElement = screen.getByTestId('line-chart');
    const chartData = JSON.parse(lineChartElement.dataset.chartdata || '[]');
    
    expect(chartData.length).toBe(6); // Current month + 5 previous months
    expect(chartData.find((d: any) => d.month === format(today, 'MMM yyyy')).totalSpending).toBe(100);
    expect(chartData.find((d: any) => d.month === format(subMonths(today, 1), 'MMM yyyy')).totalSpending).toBe(50);
    expect(chartData.find((d: any) => d.month === format(subMonths(today, 5), 'MMM yyyy')).totalSpending).toBe(75);
    // Ensure the 6th month ago is not included
    expect(chartData.find((d: any) => d.month === format(subMonths(today, 6), 'MMM yyyy'))).toBeUndefined();
  });

  it('updates chart data when period selection changes to "Last 12 Months"', async () => {
    const expenses: Expense[] = [
      { id: '1', description: 'exp1', amount: 100, date: today.toISOString(), categoryId: 'food' },
      { id: '2', description: 'exp2', amount: 200, date: subMonths(today, 11).toISOString(), categoryId: 'food' },
    ];
    renderChart({ expenses });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Last 12 Months'));
    
    const lineChartElement = screen.getByTestId('line-chart');
    const chartData = JSON.parse(lineChartElement.dataset.chartdata || '[]');

    expect(chartData.length).toBe(12);
    expect(chartData.find((d: any) => d.month === format(today, 'MMM yyyy')).totalSpending).toBe(100);
    expect(chartData.find((d: any) => d.month === format(subMonths(today, 11), 'MMM yyyy')).totalSpending).toBe(200);
  });

   it('updates chart data when period selection changes to "This Year"', async () => {
    const expensesInJan: Expense[] = [
      { id: '1', description: 'expJan', amount: 150, date: new Date(today.getFullYear(), 0, 15).toISOString(), categoryId: 'food' },
    ];
    renderChart({ expenses: expensesInJan });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('This Year'));
    
    const lineChartElement = screen.getByTestId('line-chart');
    const chartData = JSON.parse(lineChartElement.dataset.chartdata || '[]');
    
    const currentMonthIndex = today.getMonth(); // 0-indexed
    expect(chartData.length).toBe(currentMonthIndex + 1); 
    expect(chartData.find((d: any) => d.month === format(new Date(today.getFullYear(), 0, 1), 'MMM yyyy')).totalSpending).toBe(150);
  });


});
