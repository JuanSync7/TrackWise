# Authenticated Application Pages (`/src/app/(app)`)

This directory contains all the pages and associated layouts that are part of the authenticated user experience in the Trackwise application. Access to these routes typically requires the user to be logged in.

## Structure

- **`layout.tsx`**: This is the primary layout for all authenticated pages. It usually includes:
  - The main application sidebar (`AppSidebar`).
  - The main application header (`AppHeader`).
  - An `AppProvider` that wraps domain-specific context providers (PersonalFinance, Household, Trip).
  - Authentication checks to redirect unauthenticated users to the login page.

- **Page Directories (e.g., `/dashboard`, `/transactions`, `/budgets`, etc.)**: Each subdirectory represents a major feature or section of the application accessible after login.
  - Each directory typically contains a `page.tsx` file, which is the entry point for that route.
  - These page components orchestrate the UI for their respective features, often utilizing components from `/src/components` and state from `/src/contexts`.

## Key Pages and Features Housed Here

- **`/dashboard`**: The main landing page after login, providing an overview of the user's financial status.
- **`/transactions`**: Page for managing (add, edit, view, delete) personal financial transactions.
- **`/budgets`**: Page for setting and tracking personal budget goals.
- **`/goals`**: Page for managing long-term financial savings goals.
- **`/debts`**: Page for tracking personal debts (loans, credit cards).
- **`/household`**: Dashboard for household-related financial management.
  - **`/household/expense-splitting`**: Page for managing debts and settlements between household members for individually paid shared expenses.
  - **`/household/shared-budgets`**: Page for creating and managing budgets shared by the household.
  - **`/household/shopping-list`**: Page for a collaborative household shopping list.
- **`/trips`**: Page for managing group trips and their shared finances.
  - **`/trips/[tripId]`**: Detail page for a specific trip, allowing management of trip members, contributions, and expenses.
- **`/reports`**: Page for viewing financial reports, such as spending trends and budget performance.
- **`/settings`**: Page for application settings, including category management and theme preferences.

## Navigation

Navigation between these pages is primarily handled by the `AppSidebar` component and links within the application content.
```

