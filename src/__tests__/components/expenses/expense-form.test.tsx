
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm, type ExpenseFormValues } from '@/components/expenses/expense-form';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, Category, Member, SharedBudget } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { INITIAL_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';

// Mock the AI flow
jest.mock('@/ai/flows/suggest-expense-category', () => ({
  suggestExpenseCategory: jest.fn().mockResolvedValue({
    category: 'Food', // Or any default suggestion
    reasoning: 'Mocked AI suggestion.',
  }),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockUser = {
  uid: 'user-123',
  displayName: 'Current User',
  email: 'current@example.com',
} as FirebaseUser;

const mockCategories: Category[] = INITIAL_CATEGORIES;
const mockMembers: Member[] = [
  { id: 'member-1', name: 'Alice' },
  { id: 'member-2', name: 'Bob' },
  { id: 'user-123', name: 'Current User' }, // Mock current user as a member
];
const mockSharedBudgets: SharedBudget[] = [
  { id: 'sb-1', name: 'Groceries Budget', amount: 300, period: 'monthly', createdAt: new Date().toISOString(), currentSpending: 50 },
];

const mockAppContext: Partial<AppContextType> = {
  categories: mockCategories,
  members: mockMembers,
  sharedBudgets: mockSharedBudgets,
  getCategoryById: (id) => mockCategories.find(c => c.id === id),
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  // other auth functions if needed by form indirectly
};

describe('ExpenseForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const user = userEvent.setup();

  const renderForm = (expense?: any) => {
    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <AppContext.Provider value={mockAppContext as AppContextType}>
          <ExpenseForm
            expense={expense}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
            isSubmitting={false}
          />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
    mockToast.mockClear();
    (require('@/ai/flows/suggest-expense-category').suggestExpenseCategory as jest.Mock).mockClear();
  });

  it('renders all basic fields', () => {
    renderForm();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
  });

  it('pre-fills fields when editing an existing expense', () => {
    const existingExpense = {
      id: 'exp1',
      description: 'Old Dinner',
      amount: 75,
      date: '2023-10-25', // Needs to be parsable by new Date()
      categoryId: 'food',
      notes: 'Was good',
      sharedBudgetId: 'sb-1',
      isSplit: true,
      paidByMemberId: 'member-1',
      splitWithMemberIds: ['member-1', 'member-2'],
    };
    renderForm(existingExpense);

    expect(screen.getByLabelText(/description/i)).toHaveValue('Old Dinner');
    expect(screen.getByLabelText(/amount/i)).toHaveValue(75);
    // Date is tricky, check presence or specific format if possible via its trigger button
    expect(screen.getByText(format(new Date('2023-10-25'), "PPP"))).toBeInTheDocument(); 
    expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent('Food'); // Assuming 'food' category is named 'Food'
    expect(screen.getByLabelText(/notes \(optional\)/i)).toHaveValue('Was good');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    
    expect(screen.getByLabelText(/link to shared budget/i)).toHaveTextContent('Groceries Budget');
    expect(screen.getByLabelText(/split this expense/i)).toBeChecked();
    expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Alice');
    // Check selected members for split (this is more complex to assert directly)
  });

  it('calls onSave with form data when submitted', async () => {
    renderForm();
    await user.type(screen.getByLabelText(/description/i), 'Test Coffee');
    await user.clear(screen.getByLabelText(/amount/i)); // Clear default 0
    await user.type(screen.getByLabelText(/amount/i), '5.50');
    
    // Select category
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[1].name)); // Select second category

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Test Coffee',
      amount: 5.50,
      categoryId: mockCategories[1].id,
      // date will be the default current date, difficult to assert exactly without mocking Date
    }));
  });
  
  it('calls AI suggestion for category when description is typed and category is empty', async () => {
    renderForm();
    await user.type(screen.getByLabelText(/description/i), 'Expensive Dinner');
    
    await waitFor(() => {
      expect(require('@/ai/flows/suggest-expense-category').suggestExpenseCategory).toHaveBeenCalledTimes(1);
    });
    // Check if AI suggestion alert appears (if implemented to show)
    // For now, the mock for suggestExpenseCategory is enough to show it's called.
    // If the AI suggestion sets the category, we could check that too.
    // await waitFor(() => {
    //   expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent('Food');
    // });
  });

  it('handles expense splitting fields correctly', async () => {
    renderForm();
    const splitCheckbox = screen.getByLabelText(/split this expense/i);
    await user.click(splitCheckbox);

    expect(screen.getByLabelText(/who paid\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/split with whom\?/i)).toBeInTheDocument();
    
    // Default payer should be current user
    await waitFor(() => {
         expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Current User');
    });

    // Select payer
    await user.click(screen.getByRole('combobox', {name: /select member who paid/i}));
    await user.click(screen.getByText(mockMembers[0].name)); // Alice
    expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Alice');

    // Select members to split with
    const aliceCheckbox = screen.getByRole('checkbox', { name: mockMembers[0].name });
    const bobCheckbox = screen.getByRole('checkbox', { name: mockMembers[1].name });
    await user.click(aliceCheckbox);
    await user.click(bobCheckbox);

    await user.type(screen.getByLabelText(/description/i), 'Split Pizza');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '30');
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[0].name)); // Food

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      isSplit: true,
      paidByMemberId: mockMembers[0].id,
      splitWithMemberIds: expect.arrayContaining([mockMembers[0].id, mockMembers[1].id]),
    }));
  });

  it('shows error if payer is not included in splitWithMemberIds', async () => {
    renderForm();
    await user.click(screen.getByLabelText(/split this expense/i));

    // Select payer as Alice
    await user.click(screen.getByRole('combobox', {name: /select member who paid/i}));
    await user.click(screen.getByText(mockMembers[0].name));

    // Select only Bob to split with
    const bobCheckbox = screen.getByRole('checkbox', { name: mockMembers[1].name });
    await user.click(bobCheckbox);
    
    await user.type(screen.getByLabelText(/description/i), 'Faulty Split');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[0].name)); // Food

    await user.click(screen.getByRole('button', { name: /add expense/i }));
    
    expect(await screen.findByText(/The payer must be included in the list of members to split with./i)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });


  it('calls onCancel when cancel button is clicked', async () => {
    renderForm();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
