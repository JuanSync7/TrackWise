
import type { Category } from '@/lib/types';

export const APP_NAME = "Trackwise";

export const HOUSEHOLD_EXPENSE_CATEGORY_ID = 'household_expenses'; // This category ID implies it's an expense
export const POT_PAYER_ID = 'pot_payer_id'; // Special ID for expenses paid from communal pot

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', iconName: 'Utensils', color: '#FF6384', appliesTo: 'expense' },
  { id: 'groceries', name: 'Groceries', iconName: 'ShoppingCart', color: '#36A2EB', appliesTo: 'expense' },
  { id: 'transport', name: 'Transportation', iconName: 'CarFront', color: '#FFCE56', appliesTo: 'expense' },
  { id: 'housing', name: 'Housing', iconName: 'Home', color: '#4BC0C0', appliesTo: 'expense' },
  { id: 'utilities', name: 'Utilities', iconName: 'Lightbulb', color: '#9966FF', appliesTo: 'expense' },
  { id: 'entertainment', name: 'Entertainment', iconName: 'Drama', color: '#FF9F40', appliesTo: 'expense' },
  { id: 'health', name: 'Healthcare', iconName: 'HeartPulse', color: '#E83E8C', appliesTo: 'expense' },
  { id: 'shopping', name: 'Shopping', iconName: 'ShoppingBag', color: '#20C997', appliesTo: 'expense' },
  { id: 'travel', name: 'Travel', iconName: 'Plane', color: '#FD7E14', appliesTo: 'expense'},
  { id: 'education', name: 'Education', iconName: 'BookOpen', color: '#007bff', appliesTo: 'expense'},
  { id: 'personal_care', name: 'Personal Care', iconName: 'Sparkles', color: '#F76707', appliesTo: 'expense'},
  { id: 'gifts', name: 'Gifts & Donations', iconName: 'Gift', color: '#845EF7', appliesTo: 'expense'},
  { id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: 'Household Shared', iconName: 'ReceiptText', color: '#607D8B', appliesTo: 'expense' }, // For shared household expenses
  { id: 'salary', name: 'Salary', iconName: 'Briefcase', color: '#28A745', appliesTo: 'income' }, // Example income category
  { id: 'freelance', name: 'Freelance Income', iconName: 'Laptop', color: '#17A2B8', appliesTo: 'income' }, // Example income category
  { id: 'investment', name: 'Investment Income', iconName: 'TrendingUp', color: '#FFC107', appliesTo: 'income' }, // Example income category
  { id: 'other_income', name: 'Other Income', iconName: 'DollarSign', color: '#6F42C1', appliesTo: 'income' },
  { id: 'other', name: 'Other', iconName: 'Archive', color: '#6C757D', appliesTo: 'both' }, // Can be for both
];

export const DEFAULT_CURRENCY = '$';

    