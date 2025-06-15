# Trackwise - Smart Financial Management

Trackwise is a comprehensive personal and household finance management application built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI-powered features. It helps users track transactions, set budgets, manage financial goals, split expenses in households and trips, and gain insights into their spending habits.

## Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)
  - [Running Genkit Dev Server](#running-genkit-dev-server)
- [Key Features](#key-features)
- [Testing](#testing)
- [Linting and Formatting](#linting-and-formatting)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Project Structure

The project follows a standard Next.js application structure:

- **`/src`**: Contains all the core application code.
  - **`/app`**: Next.js App Router.
    - **`/(app)`**: Layout and pages for the authenticated part of the application (dashboard, transactions, budgets, etc.).
    - **`/(auth)`**: Layout and pages for authentication (login, signup).
    - **`globals.css`**: Global styles and Tailwind CSS theme definitions.
    - **`layout.tsx`**: Root layout for the entire application.
    - **`page.tsx`**: Root page, typically redirects to the dashboard or login.
  - **`/components`**: Reusable UI components.
    - **`/ui`**: ShadCN UI components.
    - **`/shared`**: Common components used across multiple features.
    - **`/budgets`, `/expenses`, `/goals`, `/household`, `/trips`, `/reports`, `/settings`, `/dashboard`, `/layout`, `/transactions`**: Feature-specific components.
  - **`/contexts`**: React Context providers for state management (Auth, PersonalFinance, Household, Trips, App).
  - **`/hooks`**: Custom React hooks (e.g., `useLocalStorage`, `useMobile`, `useToast`).
  - **`/lib`**: Utility functions, constants, type definitions, Firebase configuration, and financial calculation logic.
  - **`/ai`**: Genkit AI integration.
    - **`/flows`**: Specific AI flows (e.g., suggesting expense categories, notes).
    - **`genkit.ts`**: Genkit initialization.
    - **`dev.ts`**: Genkit development server entry point.
  - **`/__tests__`**: Jest and React Testing Library tests.
- **`/public`**: Static assets.
- **`.env`**: Environment variables (gitignored). Create `.env.local` for local development.
- **`next.config.ts`**: Next.js configuration.
- **`tailwind.config.ts`**: Tailwind CSS configuration.
- **`tsconfig.json`**: TypeScript configuration.
- **`package.json`**: Project dependencies and scripts.
- **`jest.config.js` / `jest.setup.js`**: Jest testing configuration.

For more details, refer to the README.md files within each major subdirectory.

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI Library**: React
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **AI Integration**: Genkit (with Google AI/Gemini)
- **State Management**: React Context API (with custom hooks and localStorage persistence)
- **Forms**: React Hook Form with Zod for validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Jest, React Testing Library
- **Language**: TypeScript
- **Authentication**: Firebase (mocked for local development without backend)
- **Linting/Formatting**: ESLint, Prettier (assumed, standard for Next.js projects)

## Getting Started

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm or yarn

### Environment Variables

The application uses Firebase for authentication. For local development with the mocked authentication, no specific Firebase environment variables are strictly required to run the frontend. However, if you intend to connect to a real Firebase backend, you'll need to set up a Firebase project and populate your `.env.local` file with your Firebase configuration:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

For Genkit AI features, you might need to configure API keys for the respective AI providers (e.g., Google AI). Refer to Genkit documentation for details.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Development Server

To run the Next.js development server:

```bash
npm run dev
# or
yarn dev
```

The application will typically be available at `http://localhost:9002`.

### Running Genkit Dev Server

To run the Genkit development server for AI flows (if you're working on AI features):

```bash
npm run genkit:dev
# or for watching changes:
npm run genkit:watch
```

This usually starts the Genkit server on a different port (e.g., `http://localhost:3100`).

## Key Features

- **Dashboard**: Overview of financial health, including total expenses, income, budget status, and spending charts.
- **Transaction Management**: Add, edit, delete, and view personal income and expense transactions. Supports recurring transactions.
- **Budgeting**: Set and track personal budget goals for various categories.
- **Financial Goals**: Define and monitor progress towards savings goals.
- **Debt Management**: Track personal debts, log payments, and monitor balances.
- **Household Module**:
    - Manage household members.
    - Track cash contributions to a communal pot.
    - Log shared household transactions (expenses/income) paid from the pot or by members.
    - Calculate net financial positions and settlements among members.
    - Shared Budgets: Define and manage budgets for common household expenses.
    - Expense Splitting & Debts: Track and settle individual-to-individual debts within the household.
    - Shared Shopping List: Collaborative shopping list management.
- **Trips Module**:
    - Create and manage group trips.
    - Add trip members and track their cash contributions.
    - Log trip-specific shared transactions.
    - Calculate settlements to balance expenses among trip members.
- **Reporting**:
    - Monthly spending trends.
    - Budget performance analysis.
- **Settings**:
    - Manage transaction categories (add, edit, delete custom categories).
    - Theme customization (light/dark mode).
- **AI-Powered Suggestions**:
    - Expense category suggestions based on transaction descriptions.
    - Expense note suggestions.
- **Responsive Design**: Adapts to various screen sizes.
- **Data Persistence**: Uses local storage for data persistence in the browser (mocking a backend).

## Testing

The project uses Jest and React Testing Library for unit and integration tests.

To run tests:

```bash
npm test
# or
yarn test
```

Test files are located in the `src/__tests__` directory, mirroring the structure of the `src` directory for components and pages.

## Linting and Formatting

(Assuming ESLint and Prettier are set up, which is standard for Next.js projects)
To lint the code:

```bash
npm run lint
# or
yarn lint
```

To format the code (if Prettier is configured):
```bash
npm run format # (You might need to add this script to package.json, e.g., "prettier --write .")
```

## Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

This command creates an optimized production build in the `.next` directory.

## Deployment

This Next.js application can be deployed to any platform that supports Node.js applications, such as:
- Vercel (recommended for Next.js)
- Firebase Hosting (with Cloud Functions or Cloud Run for Next.js backend features if not using App Hosting SSR)
- Firebase App Hosting (for SSR Next.js apps)
- Netlify
- AWS Amplify
- Self-hosted Node.js server

The `apphosting.yaml` file suggests configuration for Firebase App Hosting.

## Contributing

(Placeholder for contribution guidelines if this were an open-source project)
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -am 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a new Pull Request.

Please ensure your code adheres to the existing style and all tests pass.
```

