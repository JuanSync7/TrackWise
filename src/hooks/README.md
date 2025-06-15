# Custom React Hooks (`/src/hooks`)

This directory contains custom React hooks used throughout the Trackwise application. Hooks are a way to reuse stateful logic between components.

## Available Hooks

- **`use-local-storage.ts`**:
  - **Purpose**: A generic hook to persist React state to the browser's `localStorage`. It behaves similarly to `useState` but synchronizes the state with `localStorage`.
  - **Usage**:
    ```typescript
    const [storedValue, setStoredValue] = useLocalStorage<MyType>('myStorageKey', initialValue);
    ```
  - **Features**:
    - Type-safe.
    - Handles initial value from `localStorage` or a provided default.
    - Updates `localStorage` whenever the state changes.
    - Gracefully handles cases where `localStorage` is unavailable (e.g., server-side rendering, private browsing mode).

- **`use-mobile.ts`**:
  - **Purpose**: A simple hook to detect if the current viewport width corresponds to a mobile device size.
  - **Usage**:
    ```typescript
    const isMobile = useIsMobile();
    if (isMobile) {
      // Render mobile-specific UI or apply different logic
    }
    ```
  - **Details**: Uses `window.matchMedia` to check against a predefined mobile breakpoint (typically around 768px).

- **`use-toast.ts`**:
  - **Purpose**: Provides a simple and accessible way to display toast notifications (small, non-intrusive messages) to the user. This hook manages the state of toasts and provides a `toast()` function to trigger new notifications.
  - **Usage**:
    ```typescript
    const { toast } = useToast();
    // ...
    toast({ title: "Success!", description: "Your action was completed." });
    toast({ variant: "destructive", title: "Error", description: "Something went wrong." });
    ```
  - **Features**:
    - Manages a queue of toasts.
    - Supports different variants (e.g., default, destructive).
    - Integrates with the `Toaster` component (`/src/components/ui/toaster.tsx`) which is responsible for rendering the toasts.
    - Inspired by libraries like `react-hot-toast`.
```

