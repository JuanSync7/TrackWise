
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

// Mock the AI flows
jest.mock('@/ai/flows/suggest-expense-category', () => ({
  suggestExpenseCategory: jest.fn().mockResolvedValue({
    category: 'Food', 
    reasoning: 'Mocked AI category suggestion.',
  }),
}));
jest.mock('@/ai/flows/suggest-expense-notes', () => ({
  suggestExpenseNotes: jest.fn().mockResolvedValue({
    suggestedNote: 'Mocked AI note suggestion.',
    reasoning: 'AI thinks this is a good note.',
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
  { id: 'user-123', name: 'Current User' }, 
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
    (require('@/ai/flows/suggest-expense-notes').suggestExpenseNotes as jest.Mock).mockClear();
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
      date: '2023-10-25', 
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
    expect(screen.getByText(format(new Date('2023-10-25'), "PPP"))).toBeInTheDocument(); 
    expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent('Food'); 
    expect(screen.getByLabelText(/notes \(optional\)/i)).toHaveValue('Was good');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    
    expect(screen.getByLabelText(/link to shared budget/i)).toHaveTextContent('Groceries Budget');
    expect(screen.getByLabelText(/split this expense/i)).toBeChecked();
    expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Alice');
  });

  it('calls onSave with form data when submitted', async () => {
    renderForm();
    await user.type(screen.getByLabelText(/description/i), 'Test Coffee');
    await user.clear(screen.getByLabelText(/amount/i)); 
    await user.type(screen.getByLabelText(/amount/i), '5.50');
    
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[1].name)); 

    await user.click(screen.getByRole('button', { name: /add expense/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Test Coffee',
      amount: 5.50,
      categoryId: mockCategories[1].id,
    }));
  });
  
  it('calls AI for category and notes when description is typed', async () => {
    renderForm();
    await user.type(screen.getByLabelText(/description/i), 'Expensive Dinner Out');
    
    await waitFor(() => {
      expect(require('@/ai/flows/suggest-expense-category').suggestExpenseCategory).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(require('@/ai/flows/suggest-expense-notes').suggestExpenseNotes).toHaveBeenCalledTimes(1);
    });
    
    // Check if AI suggestion alert appears for category (if category is not already set by AI auto-apply)
    // For now, the mock call is enough. If it auto-applies, the category would be set.
    // Example: await waitFor(() => expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent('Food'));
    
    // Check for AI note suggestion
    await waitFor(() => {
        expect(screen.getByText(/ai note suggestion/i)).toBeInTheDocument();
        expect(screen.getByText(/"mocked ai note suggestion."/i)).toBeInTheDocument();
    });

    // Test applying note suggestion
    const applyNoteButton = screen.getByRole('button', { name: /apply suggestion/i });
    await user.click(applyNoteButton);
    expect(screen.getByLabelText(/notes \(optional\)/i)).toHaveValue('Mocked AI note suggestion.');
  });


  it('handles expense splitting fields correctly', async () => {
    renderForm();
    const splitCheckbox = screen.getByLabelText(/split this expense/i);
    await user.click(splitCheckbox);

    expect(screen.getByLabelText(/who paid\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/split with whom\?/i)).toBeInTheDocument();
    
    await waitFor(() => {
         expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Current User');
    });

    await user.click(screen.getByRole('combobox', {name: /select member who paid/i}));
    await user.click(screen.getByText(mockMembers[0].name)); 
    expect(screen.getByRole('combobox', {name: /select member who paid/i})).toHaveTextContent('Alice');

    const aliceCheckbox = screen.getByRole('checkbox', { name: mockMembers[0].name });
    const bobCheckbox = screen.getByRole('checkbox', { name: mockMembers[1].name });
    await user.click(aliceCheckbox);
    await user.click(bobCheckbox);

    await user.type(screen.getByLabelText(/description/i), 'Split Pizza');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '30');
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[0].name)); 

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

    await user.click(screen.getByRole('combobox', {name: /select member who paid/i}));
    await user.click(screen.getByText(mockMembers[0].name));

    const bobCheckbox = screen.getByRole('checkbox', { name: mockMembers[1].name });
    await user.click(bobCheckbox);
    
    await user.type(screen.getByLabelText(/description/i), 'Faulty Split');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '10');
    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[0].name)); 

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
