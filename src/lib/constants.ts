import type { Category } from '@/lib/types';
import { Utensils, ShoppingCart, CarFront, Home, Lightbulb, Drama, HeartPulse, ShoppingBag, Archive, Plane, BookOpen, Sparkles, Gift, ReceiptText } from 'lucide-react';

export const APP_NAME = "Trackwise";

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: Utensils, color: '#FF6384' },
  { id: 'groceries', name: 'Groceries', icon: ShoppingCart, color: '#36A2EB' },
  { id: 'transport', name: 'Transportation', icon: CarFront, color: '#FFCE56' },
  { id: 'housing', name: 'Housing', icon: Home, color: '#4BC0C0' },
  { id: 'utilities', name: 'Utilities', icon: Lightbulb, color: '#9966FF' },
  { id: 'entertainment', name: 'Entertainment', icon: Drama, color: '#FF9F40' },
  { id: 'health', name: 'Healthcare', icon: HeartPulse, color: '#E83E8C' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: '#20C997' },
  { id: 'travel', name: 'Travel', icon: Plane, color: '#6F42C1' },
  { id: 'education', name: 'Education', icon: BookOpen, color: '#FD7E14'},
  { id: 'personal_care', name: 'Personal Care', icon: Sparkles, color: '#F76707'},
  { id: 'gifts', name: 'Gifts & Donations', icon: Gift, color: '#845EF7'},
  { id: 'household_expenses', name: 'Household Expenses', icon: ReceiptText, color: '#607D8B' }, // New Category
  { id: 'other', name: 'Other', icon: Archive, color: '#6C757D' },
];

export const DEFAULT_CURRENCY = '$'; // Or your preferred currency symbol
