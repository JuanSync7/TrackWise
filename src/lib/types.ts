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

export interface AppState {
  expenses: Expense[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  members: Member[];
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
  // Add more actions as needed, e.g., for categories
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  variant?: 'default' | 'ghost';
}
