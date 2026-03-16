import { describe, it, expect, beforeEach } from 'vitest';
import { updateGlossary, updateGlossarySchema } from '../../mcp/tools/update_glossary.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('updateGlossarySchema', () => {
  it('should validate correct input', () => {
    expect(() => updateGlossarySchema.parse({ id: 'gls_xyz123', name: 'new_name' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => updateGlossarySchema.parse({ name: 'new_name' })).toThrow();
  });

  it('should reject missing name', () => {
    expect(() => updateGlossarySchema.parse({ id: 'gls_xyz123' })).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    expect(() => updateGlossarySchema.parse({ id: 'invalid-id', name: 'new_name' })).toThrow();
  });

  it('should reject name longer than 250 characters', () => {
    expect(() => updateGlossarySchema.parse({ id: 'gls_xyz123', name: 'a'.repeat(251) })).toThrow();
  });
});

describe('updateGlossary', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.update with correct id and name', async () => {
    const mockResult = { id: 'gls_xyz123', name: 'new_name' };
    mockTranslator.glossaries.update.mockResolvedValue(mockResult);

    const result = await updateGlossary({ id: 'gls_xyz123', name: 'new_name' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.update).toHaveBeenCalledWith('gls_xyz123', 'new_name');
    expect(result).toEqual(mockResult);
  });
});
