
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
  sharedBudgetId?: string; // Link to a shared budget

  // Expense Splitting Fields
  isSplit?: boolean;
  paidByMemberId?: string; // ID of the member who paid
  splitWithMemberIds?: string[]; // IDs of members sharing the expense (includes payer if they are sharing)
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
  currentSpending: number; // Calculated field for spending linked to this budget
}

export interface Debt {
  id: string;
  expenseId: string;
  expenseDescription: string; // For easier display
  amount: number;
  owedByMemberId: string;
  owedToMemberId: string;
  isSettled: boolean;
  createdAt: string; // ISO string date for when the debt was created
  settledAt?: string; // ISO string date for when the debt was settled
}

export interface AppState {
  expenses: Expense[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  members: Member[];
  contributions: Contribution[];
  shoppingListItems: ShoppingListItem[];
  sharedBudgets: SharedBudget[];
  debts: Debt[];
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
  addSharedBudget: (budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => void;
  deleteSharedBudget: (budgetId: string) => void;
  settleDebt: (debtId: string) => void;
  unsettleDebt: (debtId: string) => void;
  getDebtsOwedByMember: (memberId: string) => Debt[];
  getDebtsOwedToMember: (memberId: string) => Debt[];
  getAllUnsettledDebts: () => Debt[];
  getMemberById: (memberId: string) => Member | undefined;
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  variant?: 'default' | 'ghost';
}
