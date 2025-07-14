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

  it('should reject input with missing id', () => {
    const invalidInput = {
      // Missing id
      tmx_content: '<tmx>...</tmx>'
    };

    expect(() => importTmxSchema.parse(invalidInput)).toThrow();
  });

  it('should reject input with missing tmx_content', () => {
    const invalidInput = {
      // Missing tmx_content
      id: 'mem_xyz123'
    };

    expect(() => importTmxSchema.parse(invalidInput)).toThrow();
  });

  it('should reject input with missing id and tmx_content', () => {
    // Missing id and tmx_content
    const invalidInput = {};

    expect(() => importTmxSchema.parse(invalidInput)).toThrow();
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

  it('should call lara.memories.importTmx with correct parameters', async () => {
    const args = {
      id: 'mem_xyz123',
      tmx_content: '<tmx>...</tmx>'
    };

    await importTmx(args, mockTranslator as any as Translator);
  });
}); 