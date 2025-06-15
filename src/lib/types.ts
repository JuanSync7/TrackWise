
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  iconName: string; 
  color: string; 
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  categoryId: string;
  notes?: string;
  sharedBudgetId?: string; 

  isSplit?: boolean;
  paidByMemberId?: string; 
  splitWithMemberIds?: string[]; 
}

export interface BudgetGoal {
  id: string;
  categoryId: string;
  amount: number;
  currentSpending: number; 
  period: 'monthly' | 'yearly' | 'weekly'; 
}

// --- Household Specific Types ---
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
// --- End Household Specific Types ---


// --- Trip Specific Types ---
export interface Trip {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO string date
}

export interface TripMember {
  id: string;
  tripId: string;
  name: string;
}

export interface TripContribution {
  id: string;
  tripId: string;
  tripMemberId: string; // ID of the TripMember who made the contribution
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface TripExpense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  categoryId: string; // Uses general categories for now
  notes?: string;
  isSplit?: boolean;
  paidByTripMemberId?: string; 
  splitWithTripMemberIds?: string[];
}

// Placeholder for future trip-specific budget, debt types
export interface TripSharedBudget extends Omit<SharedBudget, 'currentSpending'> {
  tripId: string;
  currentSpending: number; 
}
export interface TripDebt extends Omit<Debt, 'owedByMemberId' | 'owedToMemberId'> {
  tripId: string;
  owedByTripMemberId: string;
  owedToTripMemberId: string;
}
// --- End Trip Specific Types ---


export interface ShoppingListItem {
  id: string;
  itemName: string;
  quantity: string; 
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
  currentSpending: number; 
}

export interface Debt {
  id: string;
  expenseId: string;
  expenseDescription: string; 
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
  
  // Household data
  members: Member[];
  contributions: Contribution[];
  sharedBudgets: SharedBudget[];
  debts: Debt[];
  
  shoppingListItems: ShoppingListItem[];

  // Trip data
  trips: Trip[];
  tripMembers: TripMember[];
  tripContributions: TripContribution[];
  tripExpenses: TripExpense[]; 
}

export interface TripMemberNetData {
  directContribution: number;
  shareOfExpenses: number;
  netShare: number;
}

export type AppContextType = AppState & {
  // Expense functions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
  
  // Budget Goal functions
  addBudgetGoal: (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => void;
  updateBudgetGoal: (goal: BudgetGoal) => void;
  deleteBudgetGoal: (goalId: string) => void;
  
  // Category functions
  getCategoryById: (categoryId: string) => Category | undefined;
  
  // Household Member functions
  addMember: (member: Omit<Member, 'id'>) => void;
  deleteMember: (memberId: string) => void;
  getMemberById: (memberId: string) => Member | undefined;

  // Household Contribution functions
  addContribution: (contribution: Omit<Contribution, 'id'>) => void;
  getMemberContributions: (memberId: string) => Contribution[];
  getMemberTotalContribution: (memberId: string) => number;
  getTotalHouseholdSpending: () => number;

  // Shared Budget functions (Household)
  addSharedBudget: (budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => void;
  updateSharedBudget: (budget: SharedBudget) => void;
  deleteSharedBudget: (budgetId: string) => void;

  // Debt functions (Household)
  settleDebt: (debtId: string) => void;
  unsettleDebt: (debtId: string) => void;
  getDebtsOwedByMember: (memberId: string, includeSettled?: boolean) => Debt[];
  getDebtsOwedToMember: (memberId: string, includeSettled?: boolean) => Debt[];
  getAllDebts: (includeSettled?: boolean) => Debt[];
  
  // Shopping List functions
  addShoppingListItem: (item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => void;
  editShoppingListItem: (item: Pick<ShoppingListItem, 'id' | 'itemName' | 'quantity' | 'notes'>) => void;
  toggleShoppingListItemPurchased: (itemId: string) => void;
  deleteShoppingListItem: (itemId: string) => void;
  copyLastWeeksPurchasedItems: () => number;

  // Trip functions
  addTrip: (tripData: Omit<Trip, 'id' | 'createdAt'>) => void;
  getTripById: (tripId: string) => Trip | undefined;
  getTrips: () => Trip[];

  // Trip Member functions
  addTripMember: (tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => void;
  getTripMembers: (tripId: string) => TripMember[];
  deleteTripMember: (tripMemberId: string) => void;
  getTripMemberById: (tripMemberId: string) => TripMember | undefined;

  // Trip Contribution functions
  addTripContribution: (tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => void;
  getTripContributionsForMember: (tripMemberId: string) => TripContribution[];
  getTripMemberTotalDirectContribution: (tripMemberId: string) => number;
  getTripMemberNetData: (tripId: string, tripMemberId: string) => TripMemberNetData;
  
  // Trip Expense functions
  addTripExpense: (expenseData: Omit<TripExpense, 'id'>) => void; 
  getTripExpenses: (tripId: string) => TripExpense[];
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  variant?: 'default' | 'ghost';
}

