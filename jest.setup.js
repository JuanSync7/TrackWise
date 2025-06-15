// jest.setup.js
// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined), // Ensure prefetch returns a promise
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      basePath: '',
      isPreview: false,
    };
  },
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light', // Default theme for tests
    setTheme: jest.fn(),
    forcedTheme: null,
    resolvedTheme: 'light',
    themes: ['light', 'dark'],
    systemTheme: 'light',
  }),
  ThemeProvider: ({ children }) => children,
}));


// Mock Genkit AI flow (if it's called directly in components, otherwise this might not be needed)
jest.mock('@/ai/flows/suggest-expense-category', () => ({
  suggestExpenseCategory: jest.fn().mockResolvedValue({
    category: 'Other',
    reasoning: 'Mocked AI suggestion for testing.',
  }),
}));

// Mock Firebase Auth
jest.mock('@/lib/firebase', () => ({
  ...jest.requireActual('@/lib/firebase'), // Import and retain default exports
  auth: {
    onAuthStateChanged: jest.fn(callback => {
      // Simulate a logged-in user for most tests
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      // callback(mockUser); // Uncomment to simulate logged-in user by default
      callback(null); // Simulate logged-out user by default, adjust per test suite if needed
      return jest.fn(); // Return an unsubscribe function
    }),
    // Add other mocked auth functions if needed by components during render
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef(({ children, ...props }, ref) => <div {...props} ref={ref}>{children}</div>),
      // Add other motion elements if needed, e.g., li, ul, etc.
    },
  };
});

// Mock react-day-picker (specifically for format function if it's causing issues without full context)
// This might be too broad, consider if specific parts of date-fns are the issue in components.
// For now, we'll assume components handle date formatting internally or pass formatted strings.

// Mock matchMedia for useIsMobile hook and potentially other UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false, // Default to not matching mobile for tests, can be overridden
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver - often used by UI libraries like Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));
