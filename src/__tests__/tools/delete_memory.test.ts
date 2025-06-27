import { describe, it, expect, beforeEach } from 'vitest';
import { deleteMemory, deleteMemorySchema } from '../../mcp/tools/delete_memory.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('deleteMemorySchema', () => {
  it('should validate valid input', () => {
    const validInput = {
      id: 'mem_xyz123'
    };

    expect(() => deleteMemorySchema.parse(validInput)).not.toThrow();
  });

  it('should reject input with missing id', () => {
    const invalidInput = {};

    expect(() => deleteMemorySchema.parse(invalidInput)).toThrow();
  });
});

describe('deleteMemory', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.memories.delete with correct parameters', async () => {
    const mockResult = { success: true };
    mockTranslator.memories.delete.mockResolvedValue(mockResult);

    const args = {
      id: 'mem_xyz123'
    };

    const result = await deleteMemory(args, mockTranslator as any as Translator);

    expect(mockTranslator.memories.delete).toHaveBeenCalledWith(args.id);
    expect(result).toEqual(mockResult);
  });
}); 