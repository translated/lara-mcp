import { describe, it, expect, beforeEach } from 'vitest';
import { getGlossaryCounts, getGlossaryCountsSchema } from '../../mcp/tools/get_glossary_counts.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('getGlossaryCountsSchema', () => {
  it('should validate correct input', () => {
    expect(() => getGlossaryCountsSchema.parse({ id: 'gls_xyz123' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => getGlossaryCountsSchema.parse({})).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    expect(() => getGlossaryCountsSchema.parse({ id: 'invalid-id' })).toThrow();
  });
});

describe('getGlossaryCounts', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.counts with correct id', async () => {
    const mockResult = { terms: 150, languages: 3 };
    mockTranslator.glossaries.counts.mockResolvedValue(mockResult);

    const result = await getGlossaryCounts({ id: 'gls_xyz123' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.counts).toHaveBeenCalledWith('gls_xyz123');
    expect(result).toEqual(mockResult);
  });
});
