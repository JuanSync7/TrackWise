# React Components (`/src/components`)

This directory houses all the React components used in the Trackwise application. Components are organized by feature or domain to promote modularity and reusability.

## Structure

- **`/ui`**: Contains UI primitive components, primarily sourced from [ShadCN UI](https://ui.shadcn.com/). These are general-purpose components like `Button`, `Card`, `Dialog`, `Input`, etc., styled with Tailwind CSS.

- **`/shared`**: Contains components that are reused across multiple features or contexts. Examples include:
  - `CategoryIcon.tsx`: Displays an icon for a financial category.
  - `PageHeader.tsx`: A standardized header for main application pages.

- **Feature-Specific Directories**:
  - **`/budgets`**: Components related to managing personal budgets (e.g., `BudgetForm.tsx`, `BudgetItem.tsx`, `BudgetList.tsx`).
  - **`/dashboard`**: Components specifically for the main dashboard (e.g., `SummaryCard.tsx`, `SpendingChart.tsx`, `BudgetGoalPieChart.tsx`).
  - **`/debts`**: Components for managing personal debts (e.g., `DebtForm.tsx`, `DebtItem.tsx`, `DebtList.tsx`).
  - **`/expenses`**: Components related to managing expenses (e.g., `ExpenseForm.tsx` - note: this form is generic and used by `TransactionForm`, `ExpenseItem.tsx`, `ExpenseList.tsx`).
  - **`/goals`**: Components for managing financial goals (e.g., `GoalForm.tsx`, `GoalItem.tsx`, `GoalList.tsx`).
  - **`/household`**: Components specific to household finance management (e.g., `MemberForm.tsx`, `ContributionForm.tsx`, `SharedBudgetForm.tsx`, `ShoppingListItemForm.tsx`, and their respective item/list components).
  - **`/layout`**: Components used for the main application layout (e.g., `AppHeader.tsx`, `AppSidebar.tsx`).
  - **`/reports`**: Components used for displaying financial reports (e.g., `BudgetPerformanceReport.tsx`, `MonthlySpendingTrendChart.tsx`).
  - **`/settings`**: Components for the settings page (e.g., `CategoryForm.tsx`).
  - **`/transactions`**: Components for managing transactions (e.g., `TransactionForm.tsx`, `TransactionItem.tsx`, `TransactionList.tsx`). Note: `TransactionForm` is the primary form used for personal, household, and trip transactions, configured via props.
  - **`/trips`**: Components specific to trip finance management (e.g., `TripForm.tsx`, `TripMemberForm.tsx`, `TripContributionForm.tsx`, and their respective item/list components, including `TripSettlementList.tsx`).

## Component Design Principles

- **Reusability**: Components are designed to be reusable where possible.
- **Props-Driven**: Functionality and appearance are controlled via props.
- **State Management**: Local component state is managed with `useState` and `useReducer`. Global or shared state is accessed via React Context (see `/src/contexts`).
- **Styling**: Tailwind CSS is used for styling, often in conjunction with classnames from `clsx` and `tailwind-merge` (via `cn` utility).
- **Lazy Loading**: Larger form and list components are often lazy-loaded in their parent page components using `React.lazy` and `Suspense` to improve initial page load performance.
- **Memoization**: Item components within lists are typically wrapped with `React.memo` to prevent unnecessary re-renders if their props haven't changed.
```

