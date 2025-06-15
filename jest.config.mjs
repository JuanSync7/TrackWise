// jest.config.mjs
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle CSS imports (e.g., if you import CSS files in your components)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle module aliases (if you have them in your tsconfig.json)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // Use ts-jest for .ts/.tsx files
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);