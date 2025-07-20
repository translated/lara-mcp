import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkImportStatus, checkImportStatusSchema } from '../../mcp/tools/check_import_status.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('checkImportStatusSchema', () => {
  it('should validate valid input', () => {
    const validInput = {
      id: 'import_123'
    };

    expect(() => checkImportStatusSchema.parse(validInput)).not.toThrow();
  });

  it('should reject input with missing id', () => {
    const invalidInput = {};

    expect(() => checkImportStatusSchema.parse(invalidInput)).toThrow();
  });
});

describe('checkImportStatus', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();

    // Set up the getImportStatus method if needed
    if (!mockTranslator.memories.getImportStatus) {
      mockTranslator.memories.getImportStatus = vi.fn();
    }
  });

  it('should call lara.memories.getImportStatus with correct parameters', async () => {
    const mockResult = {
      status: 'completed',
      progress: 100,
      entries_imported: 1000,
      entries_skipped: 0
    };
    mockTranslator.memories.getImportStatus.mockResolvedValue(mockResult);

    const args = {
      id: 'import_123'
    };

    const result = await checkImportStatus(args, mockTranslator as any as Translator);

    expect(mockTranslator.memories.getImportStatus).toHaveBeenCalledWith(args.id);
    expect(result).toEqual(mockResult);
  });
}); 