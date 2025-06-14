
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // Hex color for UI elements like chart segments
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  categoryId: string;
  notes?: string;
}

export interface BudgetGoal {
  id: string;
  categoryId: string;
  amount: number;
  currentSpending: number; // Calculated field
  period: 'monthly' | 'yearly' | 'weekly'; // Example periods
}

export interface Member {
  id: string;
  name: string;
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface ShoppingListItem {
  id: string;
  itemName: string;
  quantity: string; // e.g., "1 kg", "2 bottles"
  notes?: string;
  addedAt: string; // ISO string date
  isPurchased: boolean;
}

export interface SharedBudget {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'yearly' | 'weekly';
  description?: string;
  createdAt: string; // ISO string date
  // In a more complex system, you might link specific expenses or track current spending here
}

export interface AppState {
  expenses: Expense[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  members: Member[];
  contributions: Contribution[];
  shoppingListItems: ShoppingListItem[];
  sharedBudgets: SharedBudget[];
}

export type AppContextType = AppState & {
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
  addBudgetGoal: (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => void;
  updateBudgetGoal: (goal: BudgetGoal) => void;
  deleteBudgetGoal: (goalId: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
  addMember: (member: Omit<Member, 'id'>) => void;
  deleteMember: (memberId: string) => void;
  addContribution: (contribution: Omit<Contribution, 'id'>) => void;
  getMemberContributions: (memberId: string) => Contribution[];
  getMemberTotalContribution: (memberId: string) => number;
  addShoppingListItem: (item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => void;
  editShoppingListItem: (item: Pick<ShoppingListItem, 'id' | 'itemName' | 'quantity' | 'notes'>) => void;
  toggleShoppingListItemPurchased: (itemId: string) => void;
  deleteShoppingListItem: (itemId: string) => void;
  addSharedBudget: (budget: Omit<SharedBudget, 'id' | 'createdAt'>) => void;
  deleteSharedBudget: (budgetId: string) => void;
  // getSharedBudgetById: (budgetId: string) => SharedBudget | undefined; // For future use
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  variant?: 'default' | 'ghost';
}
