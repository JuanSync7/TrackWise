
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShoppingListPage from '@/app/(app)/household/shopping-list/page';
import { AppContext } from '@/contexts/app-context';
import { AuthContext } from '@/contexts/auth-context';
import type { AppContextType, ShoppingListItem } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock useToast
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

const mockShoppingListItems: ShoppingListItem[] = [
  { id: 'item1', itemName: 'Milk', quantity: '1 gallon', notes: 'Whole', addedAt: new Date().toISOString(), isPurchased: false },
  { id: 'item2', itemName: 'Bread', quantity: '1 loaf', notes: 'Sourdough', addedAt: new Date().toISOString(), isPurchased: true },
];

const mockAppContextBase: Partial<AppContextType> = {
  shoppingListItems: [], // Start with empty for some tests
  addShoppingListItem: jest.fn(),
  editShoppingListItem: jest.fn(),
  deleteShoppingListItem: jest.fn(),
  toggleShoppingListItemPurchased: jest.fn(),
  copyLastWeeksPurchasedItems: jest.fn().mockReturnValue(0),
};

describe('ShoppingListPage', () => {
  const user = userEvent.setup();

  const renderShoppingListPage = (appContextOverrides: Partial<AppContextType> = {}) => {
    const finalAppContext = { ...mockAppContextBase, ...appContextOverrides };
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false, loginWithEmail: jest.fn(), signupWithEmail: jest.fn(), logout: jest.fn() }}>
        <AppContext.Provider value={finalAppContext as AppContextType}>
          <ShoppingListPage />
        </AppContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    mockToast.mockClear();
    (mockAppContextBase.addShoppingListItem as jest.Mock).mockClear();
    (mockAppContextBase.editShoppingListItem as jest.Mock).mockClear();
    (mockAppContextBase.deleteShoppingListItem as jest.Mock).mockClear();
    (mockAppContextBase.toggleShoppingListItemPurchased as jest.Mock).mockClear();
    (mockAppContextBase.copyLastWeeksPurchasedItems as jest.Mock).mockClear();
  });

  it('renders the page header correctly', () => {
    renderShoppingListPage();
    expect(screen.getByRole('heading', { name: /household shopping list/i })).toBeInTheDocument();
    expect(screen.getByText(/manage items your household needs to buy together/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add recent purchases/i })).toBeInTheDocument();
  });

  it('renders the "Quick Add Common Items" section', () => {
    renderShoppingListPage();
    expect(screen.getByText(/quick add common items/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /milk/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eggs/i })).toBeInTheDocument();
    // Add more checks for other common items if needed
  });

  it('opens the "Add New Item" dialog when button is clicked', async () => {
    renderShoppingListPage();
    await user.click(screen.getByRole('button', { name: /add new item/i }));
    expect(screen.getByRole('dialog', { name: /add new item to shopping list/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
  });

  it('displays "Shopping List is Empty" message when no items are present', () => {
    renderShoppingListPage({ shoppingListItems: [] });
    expect(screen.getByText(/shopping list is empty/i)).toBeInTheDocument();
  });

  it('renders list of shopping items if present', () => {
    renderShoppingListPage({ shoppingListItems: mockShoppingListItems });
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.queryByText(/shopping list is empty/i)).not.toBeInTheDocument();
  });

  it('calls copyLastWeeksPurchasedItems when "Add Recent Purchases" is clicked', async () => {
    (mockAppContextBase.copyLastWeeksPurchasedItems as jest.Mock).mockReturnValueOnce(2);
    renderShoppingListPage();
    await user.click(screen.getByRole('button', { name: /add recent purchases/i }));
    expect(mockAppContextBase.copyLastWeeksPurchasedItems).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Items Copied",
      description: "2 item(s) from recent purchases were added to your list.",
    }));
  });
  
  it('calls addShoppingListItem when a quick add item is clicked', async () => {
    renderShoppingListPage();
    await user.click(screen.getByRole('button', { name: /milk/i }));
    expect(mockAppContextBase.addShoppingListItem).toHaveBeenCalledWith(expect.objectContaining({
        itemName: "Milk",
        quantity: "1", // Default quantity
    }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Milk Added",
    }));
  });

  // More tests can be added for:
  // - Interacting with ShoppingListItemForm (saving, cancelling)
  // - Interacting with ShoppingListItem (toggling purchased, editing, deleting)
  // - Confirming deletion in AlertDialog
});
