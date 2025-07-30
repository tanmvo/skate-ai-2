import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import * as React from 'react';

// Set required environment variables for tests
process.env.VOYAGE_API_KEY = 'test-api-key';

// Make React available globally for JSX
(global as typeof globalThis & { React: typeof React }).React = React;

// Create shared router mock
const mockRouterFunctions = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

// Make it globally available
(global as typeof globalThis & { mockRouterFunctions: typeof mockRouterFunctions }).mockRouterFunctions = mockRouterFunctions;

// Mock Next.js App Router context
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouterFunctions,
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Global test environment setup
beforeEach(() => {
  // Reset environment variables for each test
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('VOYAGE_API_KEY', 'test-api-key');
  delete process.env.BLOB_READ_WRITE_TOKEN;
  
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test utilities
(global as typeof globalThis & {
  createMockFile: (name: string, content: string, type?: string) => File;
}).createMockFile = (name: string, content: string, type: string = 'text/plain') => {
  const file = new File([content], name, { type });
  return file;
};

(global as typeof globalThis & {
  createMockRequest: (headers?: Record<string, string>) => { headers: { get: (key: string) => string | null } };
}).createMockRequest = (headers: Record<string, string> = {}) => {
  return {
    headers: {
      get: vi.fn((key: string) => headers[key] || null),
    },
  };
};

// Suppress console output during tests unless explicitly testing it
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Restore console for debugging when needed
(global as typeof globalThis & {
  restoreConsole: () => void;
}).restoreConsole = () => {
  global.console = originalConsole;
};

// Mock DOM APIs
Element.prototype.scrollIntoView = vi.fn();
HTMLFormElement.prototype.requestSubmit = vi.fn((submitter?: HTMLElement) => {
  // Simple implementation that triggers submit event
  const form = (submitter as HTMLInputElement | HTMLButtonElement)?.form || (submitter as HTMLFormElement);
  if (form && typeof form.onsubmit === 'function') {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
  }
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});