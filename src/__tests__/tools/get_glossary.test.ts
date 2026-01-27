import { describe, it, expect, beforeEach } from 'vitest';
import { getGlossary, getGlossarySchema } from '../../mcp/tools/get_glossary.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('getGlossarySchema', () => {
  it('should validate correct input', () => {
    expect(() => getGlossarySchema.parse({ id: 'gls_xyz123' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => getGlossarySchema.parse({})).toThrow();
  });
});

describe('getGlossary', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.get with correct id', async () => {
    const mockGlossary = {
      id: 'gls_xyz123',
      name: 'Test Glossary',
      createdAt: 1234567890,
      updatedAt: 1234567890,
      ownerId: 'user1'
    };

    mockTranslator.glossaries.get.mockResolvedValue(mockGlossary);

    const result = await getGlossary({ id: 'gls_xyz123' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.get).toHaveBeenCalledWith('gls_xyz123');
    expect(result).toEqual(mockGlossary);
  });

  it('should return null for non-existent glossary', async () => {
    mockTranslator.glossaries.get.mockResolvedValue(null);

    const result = await getGlossary({ id: 'gls_nonexistent' }, mockTranslator as any as Translator);

    expect(result).toBeNull();
  });
});
