
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetForm } from '@/components/budgets/budget-form';
import { AppContext } from '@/contexts/app-context';
import type { AppContextType, Category, BudgetGoal } from '@/lib/types';
import { INITIAL_CATEGORIES } from '@/lib/constants';

const mockCategories: Category[] = INITIAL_CATEGORIES;

const mockAppContext: Partial<AppContextType> = {
  categories: mockCategories,
  getCategoryById: (id) => mockCategories.find(c => c.id === id),
};

describe('BudgetForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const user = userEvent.setup();

  const renderForm = (budgetGoal?: BudgetGoal) => {
    render(
      <AppContext.Provider value={mockAppContext as AppContextType}>
        <BudgetForm
          budgetGoal={budgetGoal}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSubmitting={false}
        />
      </AppContext.Provider>
    );
  };

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders correctly for creating a new budget goal', () => {
    renderForm();
    expect(screen.getByRole('combobox', { name: /select category/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/budget amount/i)).toHaveValue(0);
    expect(screen.getByRole('combobox', { name: /select a budget period/i })).toHaveTextContent('Monthly');
    expect(screen.getByRole('button', { name: /set budget/i })).toBeInTheDocument();
  });

  it('pre-fills fields when editing an existing budget goal', () => {
    const existingBudget: BudgetGoal = {
      id: 'bg1',
      categoryId: mockCategories[0].id,
      amount: 150,
      period: 'weekly',
      currentSpending: 20,
    };
    renderForm(existingBudget);

    expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent(mockCategories[0].name);
    expect(screen.getByLabelText(/budget amount/i)).toHaveValue(150);
    expect(screen.getByRole('combobox', { name: /select a budget period/i })).toHaveTextContent('Weekly');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('calls onSave with form data when submitted for a new budget', async () => {
    renderForm();
    
    // Select category
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[1].name)); // Assuming second category

    // Enter amount
    await user.clear(screen.getByLabelText(/budget amount/i));
    await user.type(screen.getByLabelText(/budget amount/i), '200');

    // Select period
    await user.click(screen.getByRole('combobox', { name: /select a budget period/i }));
    await user.click(screen.getByText('Yearly'));
    
    await user.click(screen.getByRole('button', { name: /set budget/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({
      categoryId: mockCategories[1].id,
      amount: 200,
      period: 'yearly',
    });
  });

  it('calls onSave with updated data when editing and submitting', async () => {
     const existingBudget: BudgetGoal = {
      id: 'bg1',
      categoryId: mockCategories[0].id,
      amount: 150,
      period: 'weekly',
      currentSpending: 20,
    };
    renderForm(existingBudget);

    await user.clear(screen.getByLabelText(/budget amount/i));
    await user.type(screen.getByLabelText(/budget amount/i), '175');
    
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({
      categoryId: mockCategories[0].id, // Unchanged
      amount: 175, // Changed
      period: 'weekly', // Unchanged
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    renderForm();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors for required fields', async () => {
    renderForm();
    await user.click(screen.getByRole('button', { name: /set budget/i })); // Submit without filling

    expect(await screen.findByText(/please select a category/i)).toBeInTheDocument();
    expect(await screen.findByText(/amount must be positive/i)).toBeInTheDocument();
    // Period has a default, so it won't show error unless explicitly cleared if possible
  });
});

