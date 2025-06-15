# React Contexts (`/src/contexts`)

This directory contains the React Context API implementations used for state management across the Trackwise application. Contexts provide a way to pass data through the component tree without having to pass props down manually at every level.

## Available Contexts

- **`auth-context.tsx`**:
  - **Purpose**: Manages user authentication state (current user, loading status) and provides functions for login, signup, and logout.
  - **Note**: In the current version, Firebase authentication is mocked for local development.
  - **Key Exports**: `AuthProvider`, `useAuth`.

- **`personal-finance-context.tsx`**:
  - **Purpose**: Manages all data related to an individual user's personal finances. This includes:
    - Personal transactions (income/expenses).
    - Transaction categories.
    - Personal budget goals.
    - Financial savings goals.
    - Personal debts (loans, credit cards).
  - **Data Persistence**: Uses `useLocalStorage` hook to persist data in the browser.
  - **Key Exports**: `PersonalFinanceProvider`, `usePersonalFinance`.

- **`household-context.tsx`**:
  - **Purpose**: Manages data and logic for shared household finances. This includes:
    - Household members.
    - Cash contributions made by members to a communal pot.
    - Shared household transactions (expenses/income paid from the pot or by individual members for the group).
    - Shared household budgets.
    - Debts arising from individually paid shared expenses (expense splitting).
    - A collaborative shopping list.
    - Calculation of financial summaries and settlements among members.
  - **Data Persistence**: Uses `useLocalStorage`.
  - **Key Exports**: `HouseholdProvider`, `useHousehold`.

- **`trip-context.tsx`**:
  - **Purpose**: Manages data and logic for group trips. This includes:
    - Trip details (name, description).
    - Trip members.
    - Cash contributions made by trip members to a trip-specific pot.
    - Trip-specific shared transactions.
    - Calculation of financial summaries and settlements among trip members.
  - **Data Persistence**: Uses `useLocalStorage`.
  - **Key Exports**: `TripProvider`, `useTrips`.

- **`app-context.tsx`**:
  - **Purpose**: Acts as a top-level wrapper that orchestrates the domain-specific context providers (`PersonalFinanceProvider`, `HouseholdProvider`, `TripProvider`).
  - **Note**: It currently doesn't hold much direct state itself, as most state is delegated to the more specific contexts. This structure allows for better separation of concerns.
  - **Key Exports**: `AppProvider`, `useAppContext` (though direct usage of `useAppContext` might be minimal if all data comes from domain contexts).

## Usage

Each context typically exports a `Provider` component and a custom hook (e.g., `useAuth`).
- The `Provider` component should wrap the part of the component tree that needs access to the context's data.
- The custom hook is used by child components to consume the context's value (state and functions).

This separation of concerns by domain (personal, household, trip) helps in managing complexity and making the application more modular and maintainable.
```

