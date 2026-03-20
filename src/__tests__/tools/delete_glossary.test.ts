import { describe, it, expect, beforeEach } from 'vitest';
import { deleteGlossary, deleteGlossarySchema } from '../../mcp/tools/delete_glossary.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('deleteGlossarySchema', () => {
  it('should validate correct input', () => {
    expect(() => deleteGlossarySchema.parse({ id: 'gls_xyz123' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => deleteGlossarySchema.parse({})).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    expect(() => deleteGlossarySchema.parse({ id: 'invalid-id' })).toThrow();
  });
});

describe('deleteGlossary', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.delete with correct id', async () => {
    mockTranslator.glossaries.delete.mockResolvedValue(undefined);

    const result = await deleteGlossary({ id: 'gls_xyz123' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.delete).toHaveBeenCalledWith('gls_xyz123');
  });
});
