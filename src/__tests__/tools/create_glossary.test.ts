import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGlossary, createGlossarySchema } from '../../mcp/tools/create_glossary.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('createGlossarySchema', () => {
  it('should validate valid input', () => {
    expect(() => createGlossarySchema.parse({ name: 'brand_terms' })).not.toThrow();
  });

  it('should reject missing name', () => {
    expect(() => createGlossarySchema.parse({})).toThrow();
  });

  it('should reject name longer than 250 characters', () => {
    expect(() => createGlossarySchema.parse({ name: 'a'.repeat(251) })).toThrow();
  });
});

describe('createGlossary', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.create with correct name', async () => {
    const mockResult = { id: 'gls_abc123', name: 'brand_terms' };
    mockTranslator.glossaries.create.mockResolvedValue(mockResult);

    const result = await createGlossary({ name: 'brand_terms' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.create).toHaveBeenCalledWith('brand_terms');
    expect(result).toEqual(mockResult);
  });
});
