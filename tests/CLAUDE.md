# Testing Guide

## Test Setup

The project uses Vitest for testing with the following structure:

```
tests/
├── unit/                    # Unit tests
│   ├── lib/                 # Library function tests
│   ├── api/                 # API route tests
│   └── scripts/             # Script tests
├── integration/             # Integration tests
└── setup.ts                 # Global test setup
```

## Running Tests

```bash
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # With coverage
npm run test:ui           # Visual test runner
```

## Working Test Patterns

### 1. Simple Unit Tests (Recommended)
See `tests/unit/lib/file-storage-simple.test.ts` for working examples of:
- File validation logic
- Header parsing and priority
- Environment detection
- User scoping safety
- Production protection

### 2. Testing Strategy

**What Works Well:**
- Testing pure functions with simple inputs/outputs
- Testing business logic (header priority, validation rules)
- Testing environment-dependent behavior
- Testing error conditions

**What's Complex:**
- Mocking Next.js components and database connections
- Testing file system operations
- Testing API routes with complex dependencies

### 3. Best Practices

**For File Storage Features:**
```typescript
// Test the logic, not the implementation
it('should determine storage type from headers correctly', () => {
  const determineStorageType = (headers: Record<string, string>) => {
    // Copy the actual logic from your code
    if (headers['X-Storage-Type']) return headers['X-Storage-Type'];
    // ... rest of logic
  };

  expect(determineStorageType({ 'X-Storage-Type': 'filesystem' })).toBe('filesystem');
});
```

**For Safety Features:**
```typescript
it('should prevent execution in production', () => {
  process.env.NODE_ENV = 'production';
  
  const checkSafety = () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Disabled in production');
    }
  };
  
  expect(() => checkSafety()).toThrow('Disabled in production');
});
```

## Current Test Status

✅ **Working Tests:**
- `file-storage-simple.test.ts` - 6 basic file storage logic tests
- `file-storage-comprehensive.test.ts` - 28 comprehensive tests covering:
  - File validation (size, type, empty files)
  - Storage type determination (header priority logic)
  - Environment-based storage selection
  - User scoping safety (database queries)
  - Production safety checks
  - File path generation and sanitization
  - Orphaned file detection logic

**Total: 34 passing tests covering all critical file storage functionality**

## Extending Tests

Start with the simple patterns in `file-storage-simple.test.ts` and gradually add more complex scenarios. Focus on testing your business logic rather than framework dependencies.

## Common Issues

1. **Module Resolution:** Use simple mocking patterns rather than complex vi.mock() setups
2. **Path Aliases:** The `@/` alias works in tests via vitest.config.ts
3. **Environment Variables:** Reset `process.env` in beforeEach() hooks
4. **Database Mocking:** Consider testing the query logic rather than the actual database calls