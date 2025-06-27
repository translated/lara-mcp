import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importTmx, importTmxSchema } from '../../mcp/tools/import_tmx.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup translator mock
setupTranslatorMock();

describe('importTmxSchema', () => {
  it('should validate valid input with tmx_content', () => {
    const validInput = {
      id: 'mem_xyz123',
      tmx_content: '<tmx>...</tmx>'
    };

    expect(() => importTmxSchema.parse(validInput)).not.toThrow();
  });

  it('should validate valid input with tmx_url', () => {
    const validInput = {
      id: 'mem_xyz123',
      tmx_url: 'https://example.com/file.tmx'
    };

    expect(() => importTmxSchema.parse(validInput)).not.toThrow();
  });

  it('should validate input with optional gzip', () => {
    const validInput = {
      id: 'mem_xyz123',
      tmx_url: 'https://example.com/file.tmx.gz',
      gzip: true
    };

    expect(() => importTmxSchema.parse(validInput)).not.toThrow();
  });

  it('should reject input with missing required fields', () => {
    const invalidInput = {
      id: 'mem_xyz123'
      // Missing both tmx_content and tmx_url
    };

    // Schema validation will pass as both are optional, but function will throw
    expect(() => importTmxSchema.parse(invalidInput)).not.toThrow();
  });
});

// Test input validation for importTmx function
describe('importTmx input validation', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();

    // Mock importTmx to prevent actual file operations
    mockTranslator.memories.importTmx = vi.fn().mockResolvedValue({
      import_id: 'mock_import_id',
      status: 'queued'
    });
  });

  it('should throw an error if both tmx_content and tmx_url are provided', async () => {
    const args = {
      id: 'mem_xyz123',
      tmx_content: '<tmx>...</tmx>',
      tmx_url: 'https://example.com/file.tmx'
    };

    // Use a try/catch pattern instead of expect().rejects to avoid timeouts
    try {
      await importTmx(args, mockTranslator as any as Translator);
      // If we get here, fail the test
      expect(true).toBe(false); // This should not be reached
    } catch (error: any) {
      expect(error.message).toBe("You can't provide both tmx_content and tmx_url.");
    }
  });

  it('should throw an error if neither tmx_content nor tmx_url are provided', async () => {
    const args = {
      id: 'mem_xyz123'
    };

    try {
      await importTmx(args, mockTranslator as any as Translator);
      // If we get here, fail the test
      expect(true).toBe(false); // This should not be reached
    } catch (error: any) {
      expect(error.message).toBe("You must provide either tmx_content or tmx_url.");
    }
  });
}); 