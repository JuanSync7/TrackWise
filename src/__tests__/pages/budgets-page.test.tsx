
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetsPage from '@/app/(app)/budgets/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, BudgetGoal, Category } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { INITIAL_CATEGORIES, DEFAULT_CURRENCY } from '@/lib/constants';

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


const mockUser = { uid: 'test-uid' } as FirebaseUser;
const mockCategories: Category[] = INITIAL_CATEGORIES;

const mockBudgetGoalsBase: BudgetGoal[] = [
  { id: 'bg1', categoryId: 'food', amount: 200, currentSpending: 50, period: 'monthly' },
  { id: 'bg2', categoryId: 'transport', amount: 100, currentSpending: 75, period: 'monthly' },
];

const mockAppContextBase: Partial<AppContextType> = {
  budgetGoals: [...mockBudgetGoalsBase], // Clone for mutability if needed in tests
  categories: mockCategories,
  getCategoryById: (id) => mockCategories.find(cat => cat.id === id),
  addBudgetGoal: jest.fn((goal) => {
    // Simulate adding to the mock for subsequent renders/checks if necessary
    // This basic mock won't update the list in `renderPage` unless state is managed here or re-rendered
    // For this test suite, focusing on the call is often enough.
    const newGoal = { ...goal, id: `new-${Date.now()}`, currentSpending: 0 };
     // In a real app, this would trigger a re-render. For tests, we'll check the mock call.
    mockAppContextBase.budgetGoals?.push(newGoal);
  }),
  updateBudgetGoal: jest.fn((updatedGoal) => {
    if (mockAppContextBase.budgetGoals) {
        const index = mockAppContextBase.budgetGoals.findIndex(g => g.id === updatedGoal.id);
        if (index !== -1) {
            mockAppContextBase.budgetGoals[index] = { ...mockAppContextBase.budgetGoals[index], ...updatedGoal };
        }
    }
  }),
  deleteBudgetGoal: jest.fn((goalId) => {
     if (mockAppContextBase.budgetGoals) {
        mockAppContextBase.budgetGoals = mockAppContextBase.budgetGoals.filter(g => g.id !== goalId);
     }
  }),
  expenses: [], // For BudgetGoalPieChart, though it's mocked it might look for this
};


describe('BudgetsPage', () => {
  const user = userEvent.setup();

  const renderPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    // Reset to base for each render or allow specific overrides
    const currentBudgetGoals = appContextOverrides.budgetGoals || [...mockBudgetGoalsBase]; 
    const finalAppContext = { 
        ...mockAppContextBase, 
        ...appContextOverrides,
        budgetGoals: currentBudgetGoals // Ensure this is used
    };

    // Mock the PieChart to prevent Recharts errors
    jest.mock('@/components/dashboard/budget-goal-pie-chart', () => ({
        BudgetGoalPieChart: () => <div data-testid="mock-pie-chart">Mock Pie Chart</div>
    }));


    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <BudgetsPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockToast.mockClear();
    (mockAppContextBase.addBudgetGoal as jest.Mock).mockClear();
    (mockAppContextBase.updateBudgetGoal as jest.Mock).mockClear();
    (mockAppContextBase.deleteBudgetGoal as jest.Mock).mockClear();
    // Ensure the base mock list is reset for each test to avoid contamination
    mockAppContextBase.budgetGoals = [...mockBudgetGoalsBase]; 
  });

  it('renders the page header and "Set New Budget" button', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /set your budget goals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set new budget/i })).toBeInTheDocument();
  });

  it('displays existing budget goals', () => {
    renderPage();
    expect(screen.getByText(mockCategories.find(c=>c.id==='food')!.name)).toBeInTheDocument();
    expect(screen.getByText(mockCategories.find(c=>c.id==='transport')!.name)).toBeInTheDocument();
  });

  it('opens the dialog when "Set New Budget" is clicked', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: /set new budget/i }));
    expect(screen.getByRole('dialog', { name: /set new budget goal/i })).toBeInTheDocument();
  });

  it('calls addBudgetGoal when new budget form is submitted', async () => {
    renderPage({ budgetGoals: [] }); // Start with no goals for this test
    await user.click(screen.getByRole('button', { name: /set new budget/i }));

    await user.click(screen.getByRole('combobox', { name: /select category/i }));
    await user.click(screen.getByText(mockCategories[0].name)); // Select first category

    await user.clear(screen.getByLabelText(/budget amount/i));
    await user.type(screen.getByLabelText(/budget amount/i), '300');
    
    await user.click(screen.getByRole('button', { name: /set budget/i }));

    expect(mockAppContextBase.addBudgetGoal).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: mockCategories[0].id,
      amount: 300,
      period: 'monthly', // Default
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Budget Goal Set" }));
  });

  it('opens the dialog with pre-filled data when editing a budget goal', async () => {
    renderPage();
    const foodBudgetCard = screen.getByText(mockCategories.find(c=>c.id==='food')!.name).closest('div[class*="card"]');
    if (!foodBudgetCard) throw new Error("Food budget card not found");

    const optionsButton = foodBudgetCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Food budget not found");
    
    await user.click(optionsButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);
    
    expect(screen.getByRole('dialog', { name: /edit budget goal/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select category/i })).toHaveTextContent(mockCategories.find(c=>c.id==='food')!.name);
    expect(screen.getByLabelText(/budget amount/i)).toHaveValue(mockBudgetGoalsBase[0].amount); // 200
  });

  it('calls updateBudgetGoal when edited budget form is submitted', async () => {
    renderPage();
    const foodBudgetCard = screen.getByText(mockCategories.find(c=>c.id==='food')!.name).closest('div[class*="card"]');
    if (!foodBudgetCard) throw new Error("Food budget card not found");
    const optionsButton = foodBudgetCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Food budget not found");
    await user.click(optionsButton);
    const editButton = await screen.findByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    const amountInput = screen.getByLabelText(/budget amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '250');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mockAppContextBase.updateBudgetGoal).toHaveBeenCalledWith(expect.objectContaining({
      id: mockBudgetGoalsBase[0].id,
      amount: 250,
      categoryId: mockBudgetGoalsBase[0].categoryId,
      period: mockBudgetGoalsBase[0].period,
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Budget Updated" }));
  });


  it('calls deleteBudgetGoal when delete is confirmed', async () => {
    renderPage();
    const transportBudgetCard = screen.getByText(mockCategories.find(c=>c.id==='transport')!.name).closest('div[class*="card"]');
    if (!transportBudgetCard) throw new Error("Transport budget card not found");
    
    const optionsButton = transportBudgetCard.querySelector('button[aria-haspopup="menu"]');
    if (!optionsButton) throw new Error("Options button for Transport budget not found");
    await user.click(optionsButton);
    
    const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/this will permanently delete the budget goal for/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(mockAppContextBase.deleteBudgetGoal).toHaveBeenCalledWith(mockBudgetGoalsBase[1].id); // transport budget
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Budget Goal Deleted" }));
  });

  it('renders pie chart if budget goals exist', () => {
    renderPage();
    expect(screen.getByTestId('mock-pie-chart')).toBeInTheDocument();
  });

  it('does not render pie chart if no budget goals exist', () => {
    renderPage({ budgetGoals: [] });
    expect(screen.queryByTestId('mock-pie-chart')).not.toBeInTheDocument();
    expect(screen.getByText(/no budget goals set/i)).toBeInTheDocument(); // Check for empty state in list
  });
  
  it('exports budget goals to CSV', async () => {
    const mockExportToCsv = jest.fn();
    jest.spyOn(require('@/lib/utils'), 'exportToCsv').mockImplementation(mockExportToCsv); // Spy on the actual utility

    renderPage();
    await user.click(screen.getByRole('button', { name: /export budget goals/i }));
    
    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    expect(mockExportToCsv).toHaveBeenCalledWith(
      expect.stringContaining('trackwise_budget_goals_'),
      expect.arrayContaining([
        expect.arrayContaining(["ID", "Category Name", "Budgeted Amount", "Period", "Current Spending", "Currency"]),
        expect.arrayContaining([mockBudgetGoalsBase[0].id, mockCategories.find(c=>c.id===mockBudgetGoalsBase[0].categoryId)!.name, mockBudgetGoalsBase[0].amount, mockBudgetGoalsBase[0].period, mockBudgetGoalsBase[0].currentSpending, DEFAULT_CURRENCY]),
      ])
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Budget Goals Exported" }));
    
    jest.restoreAllMocks(); // Clean up spy
  });
});

