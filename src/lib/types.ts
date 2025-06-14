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

export interface AppState {
  expenses: Expense[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  members: Member[];
  contributions: Contribution[];
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
  // Add more actions as needed, e.g., for categories
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  variant?: 'default' | 'ghost';
}
