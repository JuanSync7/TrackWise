# API Client & Services (`/src/lib/api`)

This directory is intended to house code related to interacting with a backend API, should Trackwise evolve to include server-side data persistence and more complex operations.

Currently, Trackwise primarily uses `localStorage` for data persistence, making it a client-side application. However, this structure provides a clear path for future backend integration.

## Purpose

- **API Client (`api-client.ts`)**: A centralized module for making HTTP requests to the backend. This could be an Axios instance, a wrapper around `fetch`, or integrate with a library like `react-query` or `SWR` for data fetching, caching, and mutations.
- **Feature-Specific API Services (e.g., `transaction-api.ts`)**: Modules that define functions for specific API endpoints related to different features (e.g., fetching transactions, creating a budget on the server).

## Placeholder Files

- **`api-client.ts`**:
  - Would contain the setup for the base API client, including base URL, default headers, error handling, and interceptors (e.g., for adding authentication tokens).

- **`transaction-api.ts`**:
  - An example service file that would define functions like:
    - `fetchTransactions(): Promise<Transaction[]>`
    - `createTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction>`
    - `updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction>`
    - `deleteTransaction(id: string): Promise<void>`

Similar API service files would be created for other entities like budgets, goals, users, etc., as backend support is added.

## Future Development

If a backend is introduced:
1.  The `useLocalStorage` hook would be gradually replaced or augmented with calls to these API services.
2.  Contexts (`PersonalFinanceContext`, `HouseholdContext`, `TripContext`) would be updated to fetch data from and send updates to the backend via these API services.
3.  State management libraries like `react-query` or Redux Toolkit with RTK Query could be integrated for more robust server state management.
```

