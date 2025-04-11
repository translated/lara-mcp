# Lara Translate MCP Tests

This directory contains tests for the Lara Model Context Protocol implementation.

## Testing Structure

Tests are organized to mirror the codebase structure:

- `__tests__/tools/` - Tests for individual tool handlers
- `__tests__/utils/` - Test utilities and mocks

## Running Tests

Tests can be run using the following npm scripts:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Testing Approach

1. **Unit Tests**: Each tool in the `src/tools` directory has corresponding unit tests that verify:
   - Input validation with Zod schemas
   - Correct handler function behavior
   - Proper interaction with the Lara API

2. **Mocking**: The `@translated/lara` package is mocked to avoid actual API calls during testing.
   - Use the helper functions in `__tests__/utils/mocks.ts` for consistent mocking.

## Writing Tests

When writing new tests:

1. Create a new test file with the name pattern `*.test.ts` in the appropriate directory
2. Import the necessary testing utilities from Vitest
3. Use the mock utilities from `__tests__/utils/mocks.ts` to mock external dependencies
4. Write test cases that cover both success and error scenarios

Example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { someHandler, someSchema } from '../../path/to/module.js';
import { getMockTranslator, setupTranslatorMock } from '../utils/mocks.js';

// Setup mocks
setupTranslatorMock();

describe('someSchema', () => {
  it('should validate valid input', () => {
    // Test schema validation
  });
});

describe('someHandler', () => {
  let mockTranslator;
  
  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });
  
  it('should handle valid input correctly', async () => {
    // Test handler with valid input
  });
  
  it('should handle errors appropriately', async () => {
    // Test error handling
  });
});
``` 
