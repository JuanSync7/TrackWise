
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharedBudgetsPage from '@/app/(app)/household/shared-budgets/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, SharedBudget } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { formatISO } from 'date-fns';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
} as FirebaseUser;

const mockSharedBudgets: SharedBudget[] = [
  { id: 'sb1', name: 'Groceries', amount: 300, period: 'monthly', createdAt: formatISO(new Date()), currentSpending: 50, description: 'For all food' },
  { id: 'sb2', name: 'Utilities', amount: 150, period: 'monthly', createdAt: formatISO(new Date()), currentSpending: 75 },
];

const mockAppContextBase: Partial<AppContextType> = {
  sharedBudgets: [], // Start with empty for some tests
  addSharedBudget: jest.fn(),
  updateSharedBudget: jest.fn(),
  deleteSharedBudget: jest.fn(),
};

describe('SharedBudgetsPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <SharedBudgetsPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockToast.mockClear();
    (mockAppContextBase.addSharedBudget as jest.Mock).mockClear();
    (mockAppContextBase.updateSharedBudget as jest.Mock).mockClear();
    (mockAppContextBase.deleteSharedBudget as jest.Mock).mockClear();
  });

  it('renders the page header correctly', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /shared household budgets/i })).toBeInTheDocument();
    expect(screen.getByText(/manage budgets for expenses shared across the household/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create new shared budget/i })).toBeInTheDocument();
  });

  it('opens the "Create New Shared Budget" dialog when button is clicked', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /create new shared budget/i }));
    expect(screen.getByRole('dialog', { name: /create new shared budget/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument();
  });

  it('displays "No Shared Budgets Yet" message when no budgets are present', () => {
    renderPage({ sharedBudgets: [] });
    expect(screen.getByText(/no shared budgets yet/i)).toBeInTheDocument();
  });

  it('renders list of shared budgets if present', () => {
    renderPage({ sharedBudgets: mockSharedBudgets });
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.queryByText(/no shared budgets yet/i)).not.toBeInTheDocument();
  });

  it('calls addSharedBudget when new budget form is submitted', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /create new shared budget/i }));
    
    await user.type(screen.getByLabelText(/budget name/i), 'Internet Bill');
    await user.clear(screen.getByLabelText(/budget amount/i));
    await user.type(screen.getByLabelText(/budget amount/i), '60');
    // Period defaults to monthly
    
    await user.click(screen.getByRole('button', { name: /create shared budget/i }));

    expect(mockAppContextBase.addSharedBudget).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Internet Bill',
      amount: 60,
      period: 'monthly',
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Shared Budget Created",
      description: 'New shared budget "Internet Bill" has been successfully created.',
    }));
  });

  it('opens edit dialog with pre-filled data when edit is clicked on an item', async () => {
    renderPage({ sharedBudgets: mockSharedBudgets });
    // Find the edit button for "Groceries"
    // This requires knowing the structure or adding a more specific selector to SharedBudgetItem if needed
    const groceriesCard = screen.getByText('Groceries').closest('div[class*="card"]'); // Find card by title
    if (!groceriesCard) throw new Error("Groceries card not found");
    
    const optionsButton = groceriesCard.querySelector('button[aria-haspopup="menu"]'); // Find a button that triggers a menu
    if (!optionsButton) throw new Error("Options button for Groceries not found");
    await user.click(optionsButton);

    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByRole('dialog', { name: /edit shared budget/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/budget name/i)).toHaveValue('Groceries');
    expect(screen.getByLabelText(/budget amount/i)).toHaveValue(300);
    expect(screen.getByLabelText(/description \(optional\)/i)).toHaveValue('For all food');
  });
  
  it('calls updateSharedBudget when edit budget form is submitted', async () => {
    renderPage({ sharedBudgets: mockSharedBudgets });
    const groceriesCard = screen.getByText('Groceries').closest('div[class*="card"]');
    if (!groceriesCard) throw new Error("Groceries card not found");
    const optionsButton = groceriesCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Groceries not found");
    await user.click(optionsButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    const nameInput = screen.getByLabelText(/budget name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Groceries');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    expect(mockAppContextBase.updateSharedBudget).toHaveBeenCalledWith(expect.objectContaining({
        id: 'sb1', // ID of the "Groceries" budget
        name: 'Updated Groceries',
        amount: 300, // Original amount if not changed
        period: 'monthly',
        // currentSpending and createdAt should be preserved by the update logic
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Shared Budget Updated",
      description: 'The shared budget "Updated Groceries" has been successfully updated.',
    }));
  });


  it('calls deleteSharedBudget when delete is confirmed', async () => {
    renderPage({ sharedBudgets: mockSharedBudgets });
    const utilitiesCard = screen.getByText('Utilities').closest('div[class*="card"]');
    if (!utilitiesCard) throw new Error("Utilities card not found");
    const optionsButton = utilitiesCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Utilities not found");

    await user.click(optionsButton);
    const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.getByRole('alertdialog', { name: /are you sure\?/i })).toBeInTheDocument();
    expect(screen.getByText(/selected shared budget: utilities/i)).toBeInTheDocument(); // Check for specific name
    
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmDeleteButton);

    expect(mockAppContextBase.deleteSharedBudget).toHaveBeenCalledWith('sb2'); // ID of "Utilities"
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Shared Budget Deleted",
      description: 'The shared budget "Utilities" has been successfully deleted.',
    }));
  });
});
