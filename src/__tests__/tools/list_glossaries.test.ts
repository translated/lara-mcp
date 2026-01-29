import { describe, it, expect, beforeEach } from 'vitest';
import { listGlossaries, listGlossariesSchema } from '../../mcp/tools/list_glossaries.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('listGlossariesSchema', () => {
  it('should validate empty object', () => {
    expect(() => listGlossariesSchema.parse({})).not.toThrow();
  });
});

describe('listGlossaries', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.list and return the result', async () => {
    const mockGlossariesList = [
      { id: 'gls_xyz123', name: 'glossary1', createdAt: 1234567890, updatedAt: 1234567890, ownerId: 'user1' },
      { id: 'gls_abc456', name: 'glossary2', createdAt: 1234567890, updatedAt: 1234567890, ownerId: 'user1' }
    ];

    mockTranslator.glossaries.list.mockResolvedValue(mockGlossariesList);

    const result = await listGlossaries(mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.list).toHaveBeenCalled();
    expect(result).toEqual(mockGlossariesList);
  });
});
