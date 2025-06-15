
import type { Category } from '@/lib/types';

export const APP_NAME = "Trackwise";

export const HOUSEHOLD_EXPENSE_CATEGORY_ID = 'household_expenses';
export const POT_PAYER_ID = 'pot_payer_id'; // Special ID for expenses paid from communal pot

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', iconName: 'Utensils', color: '#FF6384' },
  { id: 'groceries', name: 'Groceries', iconName: 'ShoppingCart', color: '#36A2EB' },
  { id: 'transport', name: 'Transportation', iconName: 'CarFront', color: '#FFCE56' },
  { id: 'housing', name: 'Housing', iconName: 'Home', color: '#4BC0C0' },
  { id: 'utilities', name: 'Utilities', iconName: 'Lightbulb', color: '#9966FF' },
  { id: 'entertainment', name: 'Entertainment', iconName: 'Drama', color: '#FF9F40' },
  { id: 'health', name: 'Healthcare', iconName: 'HeartPulse', color: '#E83E8C' },
  { id: 'shopping', name: 'Shopping', iconName: 'ShoppingBag', color: '#20C997' },
  { id: 'travel', name: 'Travel', iconName: 'Plane', color: '#FD7E14'}, // Changed icon color to be more distinct
  { id: 'education', name: 'Education', iconName: 'BookOpen', color: '#007bff'}, // Changed icon color
  { id: 'personal_care', name: 'Personal Care', iconName: 'Sparkles', color: '#F76707'},
  { id: 'gifts', name: 'Gifts & Donations', iconName: 'Gift', color: '#845EF7'},
  { id: HOUSEHOLD_EXPENSE_CATEGORY_ID, name: 'Household Expenses', iconName: 'ReceiptText', color: '#607D8B' },
  { id: 'other', name: 'Other', iconName: 'Archive', color: '#6C757D' },
];

export const DEFAULT_CURRENCY = '$'; // Or your preferred currency symbol

