
import type { LucideIcon } from 'lucide-react';

export type TransactionType = 'expense' | 'income';
export type RecurrencePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  appliesTo: 'expense' | 'income' | 'both';
}

// Base Transaction type
interface BaseTransaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  categoryId: string;
  notes?: string;
  transactionType: TransactionType;
  isRecurring?: boolean;
  recurrencePeriod?: RecurrencePeriod;
  recurrenceEndDate?: string; // ISO string date
  nextRecurrenceDate?: string; // ISO string date, calculated for display/reminders
}

// Personal Transaction
export interface Transaction extends BaseTransaction {
  // Personal transactions will use the full BaseTransaction spec
}

// Household Transaction (includes shared features)
export interface HouseholdTransaction extends BaseTransaction {
  sharedBudgetId?: string;
  isSplit?: boolean;
  paidByMemberId?: string;
  splitWithMemberIds?: string[];
}

// Trip Transaction (similar to HouseholdTransaction but for trips)
export interface TripTransaction extends BaseTransaction {
  tripId: string;
  isSplit?: boolean;
  paidByTripMemberId?: string;
  splitWithTripMemberIds?: string[];
}


export interface BudgetGoal {
  id: string;
  categoryId: string;
  amount: number;
  currentSpending: number;
  period: 'monthly' | 'yearly' | 'weekly';
}

// --- Financial Goals ---
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate?: string; // ISO string date
  createdAt: string; // ISO string date
  notes?: string;
}

// --- Personal Debts ---
export interface PersonalDebt {
  id: string;
  name: string; // e.g., "Car Loan", "Student Loan"
  lender?: string; // e.g., "Bank of America"
  initialAmount: number;
  currentBalance: number;
  interestRate?: number; // Annual percentage rate
  minimumPayment?: number;
  dueDate?: string; // e.g., "15th of month" or specific date for one-time
  notes?: string;
  createdAt: string; // ISO string date
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
  date: string;
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
  createdAt: string;
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
  createdAt: string;
  settledAt?: string;
}

export type HouseholdSettlement = Omit<TripSettlement, 'tripId'>;


export interface ShoppingListItem {
  id: string;
  itemName: string;
  quantity: string;
  notes?: string;
  addedAt: string;
  isPurchased: boolean;
}
// --- End Household Specific Types ---


// --- Trip Specific Types ---
export interface Trip {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  name: string;
}

export interface TripContribution {
  id: string;
  tripId: string;
  tripMemberId: string;
  amount: number;
  date: string;
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
  transactions: Transaction[];
  categories: Category[];
  budgetGoals: BudgetGoal[];
  financialGoals: FinancialGoal[];
  personalDebts: PersonalDebt[];

  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (transactionId: string) => void;

  addCategory: (categoryData: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;

  addBudgetGoal: (goal: Omit<BudgetGoal, 'id' | 'currentSpending'>) => void;
  updateBudgetGoal: (goal: BudgetGoal) => void;
  deleteBudgetGoal: (goalId: string) => void;

  addFinancialGoal: (goal: Omit<FinancialGoal, 'id' | 'createdAt' | 'currentAmount'>) => void;
  updateFinancialGoal: (goal: FinancialGoal) => void;
  deleteFinancialGoal: (goalId: string) => void;
  contributeToFinancialGoal: (goalId: string, amount: number) => void;

  addPersonalDebt: (debt: Omit<PersonalDebt, 'id' | 'createdAt' | 'currentBalance'>) => void;
  updatePersonalDebt: (debt: PersonalDebt) => void;
  deletePersonalDebt: (debtId: string) => void;
  logPaymentToPersonalDebt: (debtId: string, paymentAmount: number, transactionDetails?: Omit<Transaction, 'id' | 'amount' | 'categoryId' | 'transactionType'>) => void;
}

export interface HouseholdContextType {
  members: Member[];
  householdTransactions: HouseholdTransaction[];
  contributions: Contribution[];
  sharedBudgets: SharedBudget[];
  debts: Debt[];
  shoppingListItems: ShoppingListItem[];
  householdFinancialSummaries: Record<string, CalculatedMemberFinancials>;
  householdOverallSettlements: HouseholdSettlement[];

  addMember: (member: Omit<Member, 'id'>) => void;
  deleteMember: (memberId: string) => void;
  getMemberById: (memberId: string) => Member | undefined;

  addHouseholdTransaction: (transaction: Omit<HouseholdTransaction, 'id'>) => void;
  updateHouseholdTransaction: (transaction: HouseholdTransaction) => void;
  deleteHouseholdTransaction: (transactionId: string) => void;

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
  tripContributions: TripContribution[];
  tripTransactions: TripTransaction[];
  tripFinancialSummaries: Record<string, Record<string, CalculatedMemberFinancials>>;
  tripSettlementsMap: Record<string, TripSettlement[]>;

  addTrip: (tripData: Omit<Trip, 'id' | 'createdAt'>) => void;
  getTripById: (tripId: string) => Trip | undefined;
  getTrips: () => Trip[];

  addTripMember: (tripId: string, memberData: Omit<TripMember, 'id' | 'tripId'>) => void;
  getTripMembers: (tripId: string) => TripMember[];
  deleteTripMember: (tripMemberId: string, tripId: string) => void;
  getTripMemberById: (tripMemberId: string) => TripMember | undefined;

  addTripContribution: (tripId: string, tripMemberId: string, contributionData: Omit<TripContribution, 'id' | 'tripId' | 'tripMemberId'>) => void;
  getTripContributionsForMember: (tripMemberId: string, tripId?: string) => TripContribution[];
  getTripMemberTotalDirectContribution: (tripMemberId: string, tripIdToFilter?: string) => number;

  addTripTransaction: (transactionData: Omit<TripTransaction, 'id'>) => void;
  updateTripTransaction: (transactionData: TripTransaction) => void;
  deleteTripTransaction: (transactionId: string) => void;
  getTripTransactions: (tripId: string) => TripTransaction[];
  
  getTripMemberNetData: (tripId: string, tripMemberId: string) => MemberDisplayFinancials;
  getTripSettlements: (tripId: string) => TripSettlement[];
  triggerTripSettlementCalculation: (tripId: string) => void;
}

export interface AppContextType {
  // Currently empty as state is delegated
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  external?: boolean;
  submenu?: NavItem[];
}

