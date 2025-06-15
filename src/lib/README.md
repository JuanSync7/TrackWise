# Library & Utilities (`/src/lib`)

This directory serves as a central place for various utility functions, constants, type definitions, and essential configurations that are used across the Trackwise application.

## Contents

- **`constants.ts`**:
  - Defines application-wide constants such as:
    - `APP_NAME`: The name of the application.
    - `INITIAL_CATEGORIES`: A predefined list of default transaction categories.
    - `DEFAULT_CURRENCY`: The default currency symbol used for display.
    - `HOUSEHOLD_EXPENSE_CATEGORY_ID`: A special category ID for general household expenses.
    - `POT_PAYER_ID`: A special ID to denote that an expense was paid from a communal pot (household or trip).

- **`firebase.ts`**:
  - Handles the initialization of the Firebase SDK.
  - Exports Firebase services like `auth`.
  - **Note**: For the current version, Firebase authentication is mocked for local development, so this file primarily sets up the structure for potential real Firebase integration.

- **`financial-utils.ts`**:
  - Contains core financial calculation logic, especially for determining settlements in shared contexts (household and trips).
  - Includes functions like `calculateNetFinancialPositions` and `generateSettlements`.
  - Defines interfaces for inputs and outputs of these financial calculations (e.g., `MemberInput`, `ExpenseInput`, `CalculatedMemberFinancials`, `RawSettlement`).
  - `financial-utils.test.ts` provides unit tests for this critical logic.

- **`icon-map.ts`**:
  - Maps string names (e.g., "Utensils", "ShoppingCart") to their corresponding Lucide React icon components.
  - Provides `getIconComponent` to retrieve an icon component by name and `DEFAULT_ICON_NAME` as a fallback.
  - Exports `availableIconNames` for use in UI elements like icon selectors.

- **`types.ts`**:
  - Contains all TypeScript type definitions and interfaces used throughout the application. This includes types for:
    - Transactions (Personal, Household, Trip)
    - Categories, Budget Goals, Financial Goals, Personal Debts
    - Household specific entities (Member, Contribution, SharedBudget, Debt, ShoppingListItem, HouseholdSettlement)
    - Trip specific entities (Trip, TripMember, TripContribution, TripSettlement)
    - Context types (PersonalFinanceContextType, HouseholdContextType, TripContextType)
    - Navigation items (`NavItem`)
    - And other shared data structures.

- **`utils.ts`**:
  - Provides general utility functions:
    - `cn`: A helper function (from ShadCN UI) for conditionally joining class names using `clsx` and `tailwind-merge`.
    - `exportToCsv`: A utility to convert an array of data rows into a CSV file and trigger a download in the browser.

This directory is crucial for maintaining consistency, reusability, and type safety within the application.
```

