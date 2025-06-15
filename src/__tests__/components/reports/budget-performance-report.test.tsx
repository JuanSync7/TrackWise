
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BudgetPerformanceReport } from '@/components/reports/budget-performance-report';
import { AppContext } from '@/contexts/app-context';
import type { AppContextType, BudgetGoal, Expense, Category } from '@/lib/types';
import { DEFAULT_CURRENCY, INITIAL_CATEGORIES } from '@/lib/constants';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const mockCategories: Category[] = INITIAL_CATEGORIES;
const foodCategory = mockCategories.find(c => c.id === 'food')!;
const transportCategory = mockCategories.find(c => c.id === 'transport')!;

const today = new Date();
const currentMonthStart = startOfMonth(today);

const mockAppContextBase: Partial<AppContextType> = {
  expenses: [],
  budgetGoals: [],
  categories: mockCategories,
  getCategoryById: (id) => mockCategories.find(c => c.id === id),
};

describe('BudgetPerformanceReport', () => {
  const renderReport = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    render(
      <AppContext.Provider value={finalAppContext as AppContextType}>
        <BudgetPerformanceReport />
      </AppContext.Provider>
    );
  };

  it('renders the card title and description for the current month', () => {
    renderReport();
    expect(screen.getByText('Monthly Budget Performance')).toBeInTheDocument();
    const expectedDescription = `Compare your budgeted amounts against actual spending for ${format(today, 'MMMM yyyy')}.`;
    expect(screen.getByText(expectedDescription)).toBeInTheDocument();
  });

  it('shows an empty state message if no monthly budget goals are set', () => {
    renderReport({ budgetGoals: [] });
    expect(screen.getByText(/no monthly budget goals set yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the table with correct data for a budget goal with spending', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 200, period: 'monthly', currentSpending: 0 /* Ignored, recalculated */ },
    ];
    const expenses: Expense[] = [
      { id: 'e1', description: 'Lunch', amount: 50, date: currentMonthStart.toISOString(), categoryId: foodCategory.id },
    ];
    renderReport({ budgetGoals, expenses });

    const table = screen.getByRole('table');
    const row = within(table).getAllByRole('row')[1]; // Skip header row

    expect(within(row).getByText(foodCategory.name)).toBeInTheDocument();
    expect(within(row).getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Budgeted
    expect(within(row).getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument();  // Spent
    expect(within(row).getByText(`${DEFAULT_CURRENCY}150.00`)).toBeInTheDocument(); // Difference
    expect(within(row).getByText('Under Budget')).toBeInTheDocument();
  });

  it('correctly displays "Over Budget" status and negative difference', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 100, period: 'monthly', currentSpending: 0 },
    ];
    const expenses: Expense[] = [
      { id: 'e1', description: 'Dinner', amount: 120, date: currentMonthStart.toISOString(), categoryId: foodCategory.id },
    ];
    renderReport({ budgetGoals, expenses });

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText(`-${DEFAULT_CURRENCY}20.00`)).toBeInTheDocument(); // Difference
    expect(within(row).getByText('Over Budget')).toBeInTheDocument();
  });

  it('correctly displays "On Track" status', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 100, period: 'monthly', currentSpending: 0 },
    ];
    const expenses: Expense[] = [
      { id: 'e1', description: 'Snack', amount: 100, date: currentMonthStart.toISOString(), categoryId: foodCategory.id },
    ];
    renderReport({ budgetGoals, expenses });
    
    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText(`${DEFAULT_CURRENCY}0.00`)).toBeInTheDocument(); // Difference
    expect(within(row).getByText('On Track')).toBeInTheDocument();
  });

  it('correctly displays "No Spending" status', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 100, period: 'monthly', currentSpending: 0 },
    ];
    renderReport({ budgetGoals, expenses: [] }); // No expenses

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText(`${DEFAULT_CURRENCY}100.00`)).toBeInTheDocument(); // Difference
    expect(within(row).getByText('No Spending')).toBeInTheDocument();
  });

  it('filters expenses for the current month only', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 200, period: 'monthly', currentSpending: 0 },
    ];
    const expenses: Expense[] = [
      { id: 'e1', description: 'Current month', amount: 50, date: currentMonthStart.toISOString(), categoryId: foodCategory.id },
      { id: 'e2', description: 'Last month', amount: 70, date: subMonths(currentMonthStart, 1).toISOString(), categoryId: foodCategory.id },
    ];
    renderReport({ budgetGoals, expenses });

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument();  // Spent (should only be current month's)
    expect(within(row).getByText(`${DEFAULT_CURRENCY}150.00`)).toBeInTheDocument(); // Difference
  });

  it('only considers "monthly" budget goals', () => {
    const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 200, period: 'monthly', currentSpending: 0 },
      { id: 'bg2', categoryId: transportCategory.id, amount: 500, period: 'yearly', currentSpending: 0 },
    ];
    renderReport({ budgetGoals });

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2); // Header + 1 data row (only for food)
    expect(screen.getByText(foodCategory.name)).toBeInTheDocument();
    expect(screen.queryByText(transportCategory.name)).not.toBeInTheDocument();
  });

  it('handles multiple budget goals correctly', () => {
     const budgetGoals: BudgetGoal[] = [
      { id: 'bg1', categoryId: foodCategory.id, amount: 200, period: 'monthly', currentSpending: 0 },
      { id: 'bg2', categoryId: transportCategory.id, amount: 100, period: 'monthly', currentSpending: 0 },
    ];
    const expenses: Expense[] = [
      { id: 'e1', description: 'Groceries', amount: 150, date: currentMonthStart.toISOString(), categoryId: foodCategory.id },
      { id: 'e2', description: 'Bus fare', amount: 110, date: currentMonthStart.toISOString(), categoryId: transportCategory.id },
    ];
    renderReport({ budgetGoals, expenses });

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(3); // Header + 2 data rows

    // Food row
    const foodRow = rows[1];
    expect(within(foodRow).getByText(foodCategory.name)).toBeInTheDocument();
    expect(within(foodRow).getByText(`${DEFAULT_CURRENCY}200.00`)).toBeInTheDocument(); // Budgeted
    expect(within(foodRow).getByText(`${DEFAULT_CURRENCY}150.00`)).toBeInTheDocument(); // Spent
    expect(within(foodRow).getByText(`${DEFAULT_CURRENCY}50.00`)).toBeInTheDocument(); // Diff
    expect(within(foodRow).getByText('Under Budget')).toBeInTheDocument();

    // Transport row
    const transportRow = rows[2];
    expect(within(transportRow).getByText(transportCategory.name)).toBeInTheDocument();
    expect(within(transportRow).getByText(`${DEFAULT_CURRENCY}100.00`)).toBeInTheDocument(); // Budgeted
    expect(within(transportRow).getByText(`${DEFAULT_CURRENCY}110.00`)).toBeInTheDocument(); // Spent
    expect(within(transportRow).getByText(`-${DEFAULT_CURRENCY}10.00`)).toBeInTheDocument(); // Diff
    expect(within(transportRow).getByText('Over Budget')).toBeInTheDocument();
  });
});
