# Trackwise Source Code (`/src`)

This directory contains the core source code for the Trackwise application.

## Subdirectories

- **`/app`**: Contains all the routes, layouts, and UI for the Next.js application, following the App Router paradigm.
  - See `/src/app/README.md` for more details.

- **`/components`**: Houses all React components used throughout the application.
  - See `/src/components/README.md` for more details on component organization.

- **`/contexts`**: Includes React Context API implementations for global and feature-specific state management.
  - See `/src/contexts/README.md` for an overview of the available contexts.

- **`/hooks`**: Contains custom React hooks used to encapsulate reusable logic or interact with browser APIs/state.
  - See `/src/hooks/README.md` for descriptions of custom hooks.

- **`/lib`**: A collection of libraries, utility functions, constants, type definitions, and configurations.
  - See `/src/lib/README.md` for more details on its contents.

- **`/ai`**: Manages the integration with Genkit for AI-powered features.
  - See `/src/ai/README.md` for details on AI flows and Genkit setup.

- **`/__tests__`**: Contains all test files, using Jest and React Testing Library. The structure within `__tests__` mirrors the `src` directory.

## General Coding Practices

- **TypeScript**: The entire codebase is written in TypeScript for type safety and improved developer experience.
- **Functional Components & Hooks**: We primarily use functional components and React Hooks.
- **Modularity**: Code is organized into modules by feature and domain to enhance maintainability and scalability.
- **Error Handling**: Efforts are made to handle potential errors gracefully, especially in data operations and API interactions (even if mocked locally).
- **Accessibility (A11y)**: Semantic HTML and ARIA attributes are used where appropriate to improve accessibility, primarily driven by ShadCN UI components.
- **Performance**: Techniques like lazy loading, memoization (`React.memo`, `useMemo`, `useCallback`), and efficient state management are employed to optimize performance.
```

