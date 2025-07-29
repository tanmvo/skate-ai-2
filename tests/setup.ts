import { vi } from 'vitest';

// Global test environment setup
beforeEach(() => {
  // Reset environment variables for each test
  process.env.NODE_ENV = 'test';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test utilities
global.createMockFile = (name: string, content: string, type: string = 'text/plain') => {
  const file = new File([content], name, { type });
  return file;
};

global.createMockRequest = (headers: Record<string, string> = {}) => {
  return {
    headers: {
      get: vi.fn((key: string) => headers[key] || null),
    },
  } as any;
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
global.restoreConsole = () => {
  global.console = originalConsole;
};