import { describe, it, expect, beforeEach } from 'vitest';
import { listMemories, listMemoriesSchema } from '../../tools/list_memories.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('listMemoriesSchema', () => {
  it('should validate empty object', () => {
    expect(() => listMemoriesSchema.parse({})).not.toThrow();
  });
});

describe('listMemories', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.memories.list and return the result', async () => {
    const mockMemoriesList = [
      { id: 'mem_xyz123', name: 'memory1' },
      { id: 'mem_abc456', name: 'memory2' }
    ];

    mockTranslator.memories.list.mockResolvedValue(mockMemoriesList);

    const result = await listMemories(mockTranslator as any as Translator);

    expect(mockTranslator.memories.list).toHaveBeenCalled();
    expect(result).toEqual(mockMemoriesList);
  });
}); 