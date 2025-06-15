
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

// Base Expense type
interface BaseExpense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  categoryId: string;
  notes?: string;
}

// Personal Expense
export interface Expense extends BaseExpense {
  // Personal expenses don't typically have sharedBudgetId, isSplit, etc.
  // unless it's a personal expense being split with non-household members,
  // but for this app's structure, we'll keep them simpler.
}

// Household Expense (includes shared features)
export interface HouseholdExpense extends BaseExpense {
  sharedBudgetId?: string;
  isSplit?: boolean;
  paidByMemberId?: string; // Can be a household member ID or POT_PAYER_ID
  splitWithMemberIds?: string[]; // Household member IDs
}

// Trip Expense (similar to HouseholdExpense but for trips)
export interface TripExpense extends BaseExpense {
  tripId: string;
  isSplit?: boolean;
  paidByTripMemberId?: string; // Can be a trip member ID or POT_PAYER_ID
  splitWithTripMemberIds?: string[]; // Trip member IDs
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

export interface Contribution { // To household pot
  id: string;
  memberId: string;
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface CalculatedMemberFinancials {
  memberId: string;
  directCashContribution: number;
  amountPersonallyPaidForGroup: number;
  totalShareOfAllGroupExpenses: number;
  finalNetShareForSettlement: number;
}

export interface MemberDisplayFinancials {
  directCashContribution: number;
  amountPersonallyPaidForGroup: number;
  totalShareOfAllGroupExpenses: number;
  netOverallPosition: number;
}

export type HouseholdMemberNetData = MemberDisplayFinancials;
export type TripMemberNetData = MemberDisplayFinancials;


export interface SharedBudget {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'yearly' | 'weekly';
  description?: string;
  createdAt: string; // ISO string date
  currentSpending: number;
}

export interface Debt { // Inter-member debt, not involving household pot directly
  id: string;
  expenseId: string; // ID of the HouseholdExpense that generated this debt
  expenseDescription: string;
  amount: number;
  owedByMemberId: string;
  owedToMemberId: string;
  isSettled: boolean;
  createdAt: string; // ISO string date for when the debt was created
  settledAt?: string; // ISO string date for when the debt was settled
}

// Using TripSettlement type for household settlements as structure is identical
export type HouseholdSettlement = Omit<TripSettlement, 'tripId'>;


export interface ShoppingListItem {
  id: string;
  itemName: string;
  quantity: string;
  notes?: string;
  addedAt: string; // ISO string date
  isPurchased: boolean;
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

export interface TripContribution { // To trip pot
  id: string;
  tripId: string;
  tripMemberId: string;
  amount: number;
  date: string; // ISO string date
  notes?: string;
}

export interface TripSettlement {
  id: string;
  tripId: string;
  owedByTripMemberId: string;
  owedToTripMemberId: string;
  amount: number;
}
// --- End Trip Specific Types ---


// --- Context Types ---

export interface PersonalFinanceContextType {
  expenses: Expense[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
  addBudgetGoal: (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => void;
  updateBudgetGoal: (goal: BudgetGoal) => void;
  deleteBudgetGoal: (goalId: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
}

export interface HouseholdContextType {
  members: Member[];
  householdExpenses: HouseholdExpense[];
  contributions: Contribution[]; // Contributions to household pot
  sharedBudgets: SharedBudget[];
  debts: Debt[]; // Inter-member debts from household expense splits
  shoppingListItems: ShoppingListItem[];
  householdFinancialSummaries: Record<string, CalculatedMemberFinancials>;
  householdOverallSettlements: HouseholdSettlement[];

  addMember: (member: Omit<Member, 'id'>) => void;
  deleteMember: (memberId: string) => void;
  getMemberById: (memberId: string) => Member | undefined;

  addHouseholdExpense: (expense: Omit<HouseholdExpense, 'id'>) => void;
  updateHouseholdExpense: (expense: HouseholdExpense) => void;
  deleteHouseholdExpense: (expenseId: string) => void;

  addContribution: (contribution: Omit<Contribution, 'id'>) => void;
  getMemberContributions: (memberId: string) => Contribution[];
  getMemberTotalContribution: (memberId: string) => number;

  addSharedBudget: (budget: Omit<SharedBudget, 'id' | 'createdAt' | 'currentSpending'>) => void;
  updateSharedBudget: (budget: SharedBudget) => void;
  deleteSharedBudget: (budgetId: string) => void;

  settleDebt: (debtId: string) => void;
  unsettleDebt: (debtId: string) => void;
  getDebtsOwedByMember: (memberId: string, includeSettled?: boolean) => Debt[];
  getDebtsOwedToMember: (memberId: string, includeSettled?: boolean) => Debt[];
  getAllDebts: (includeSettled?: boolean) => Debt[];

  addShoppingListItem: (item: Omit<ShoppingListItem, 'id' | 'isPurchased' | 'addedAt'>) => void;
  editShoppingListItem: (item: Pick<ShoppingListItem, 'id' | 'itemName' | 'quantity' | 'notes'>) => void;
  toggleShoppingListItemPurchased: (itemId: string) => void;
  deleteShoppingListItem: (itemId: string) => void;
  copyLastWeeksPurchasedItems: () => number;
  
  getHouseholdMemberNetData: (memberId: string) => MemberDisplayFinancials;
  triggerHouseholdSettlementCalculation: () => void;
}

export interface TripContextType {
  trips: Trip[];
  tripMembers: TripMember[];
  tripContributions: TripContribution[]; // Contributions to specific trip pots
  tripExpenses: TripExpense[];
  tripFinancialSummaries: Record<string, Record<string, CalculatedMemberFinancials>>; // Outer: tripId, Inner: tripMemberId
  tripSettlementsMap: Record<string, TripSettlement[]>; // Keyed by tripId

  addTrip: (tripData: Omit<Trip, 'id' | 'createdAt'>) => void;
  getTripById: (tripId: string) => Trip | undefined;
  getTrips: () => Trip[];

  addTripMember: (tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => void;
  getTripMembers: (tripId: string) => TripMember[];
  deleteTripMember: (tripMemberId: string, tripId: string) => void;
  getTripMemberById: (tripMemberId: string) => TripMember | undefined;

  addTripContribution: (tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => void;
  getTripContributionsForMember: (tripMemberId: string, tripId?: string) => TripContribution[]; // Optional tripId to filter
  getTripMemberTotalDirectContribution: (tripMemberId: string, tripIdToFilter?: string) => number;

  addTripExpense: (expenseData: Omit<TripExpense, 'id'>) => void;
  updateTripExpense: (expenseData: TripExpense) => void; // Added
  deleteTripExpense: (expenseId: string) => void; // Added
  getTripExpenses: (tripId: string) => TripExpense[];
  
  getTripMemberNetData: (tripId: string, tripMemberId: string) => MemberDisplayFinancials;
  getTripSettlements: (tripId: string) => TripSettlement[];
  triggerTripSettlementCalculation: (tripId: string) => void;
}

// This AppContextType might become very minimal or be removed if all data is delegated.
// For now, let's assume it might hold some truly global, non-domain-specific state or functions if any arise.
// However, the goal is to move everything to the domain-specific contexts.
export interface AppContextType {
  // Placeholder for any truly global app settings or functions in the future.
  // For now, it will be empty as we delegate everything.
}
