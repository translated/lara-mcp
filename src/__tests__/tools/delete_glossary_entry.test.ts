import { describe, it, expect, beforeEach } from 'vitest';
import { deleteGlossaryEntry, deleteGlossaryEntrySchema } from '../../mcp/tools/delete_glossary_entry.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import { InvalidInputError } from '../../exception.js';

// Setup mocks
setupTranslatorMock();

describe('deleteGlossaryEntrySchema', () => {
  it('should validate input with term', () => {
    const input = {
      id: 'gls_xyz123',
      term: { language: 'en-US', value: 'Hello' },
    };
    expect(() => deleteGlossaryEntrySchema.parse(input)).not.toThrow();
  });

  it('should validate input with guid', () => {
    const input = {
      id: 'gls_xyz123',
      guid: 'entry-123',
    };
    expect(() => deleteGlossaryEntrySchema.parse(input)).not.toThrow();
  });

  it('should validate input with both term and guid', () => {
    const input = {
      id: 'gls_xyz123',
      term: { language: 'en-US', value: 'Hello' },
      guid: 'entry-123',
    };
    expect(() => deleteGlossaryEntrySchema.parse(input)).not.toThrow();
  });

  it('should reject missing id', () => {
    const input = {
      term: { language: 'en-US', value: 'Hello' },
    };
    expect(() => deleteGlossaryEntrySchema.parse(input)).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      id: 'invalid-id',
      term: { language: 'en-US', value: 'Hello' },
    };
    expect(() => deleteGlossaryEntrySchema.parse(input)).toThrow();
  });
});

describe('deleteGlossaryEntry', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.deleteEntry with term', async () => {
    const mockResult = { id: 'imp_abc', status: 'pending' };
    mockTranslator.glossaries.deleteEntry.mockResolvedValue(mockResult);

    const args = {
      id: 'gls_xyz123',
      term: { language: 'en-US', value: 'Hello' },
    };

    const result = await deleteGlossaryEntry(args, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.deleteEntry).toHaveBeenCalledWith(
      'gls_xyz123',
      { language: 'en-US', value: 'Hello' },
      undefined
    );
    expect(result).toEqual(mockResult);
  });

  it('should call lara.glossaries.deleteEntry with guid', async () => {
    const mockResult = { id: 'imp_abc', status: 'pending' };
    mockTranslator.glossaries.deleteEntry.mockResolvedValue(mockResult);

    const args = {
      id: 'gls_xyz123',
      guid: 'entry-123',
    };

    const result = await deleteGlossaryEntry(args, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.deleteEntry).toHaveBeenCalledWith(
      'gls_xyz123',
      undefined,
      'entry-123'
    );
    expect(result).toEqual(mockResult);
  });

  it('should throw InvalidInputError when neither term nor guid is provided', async () => {
    const args = {
      id: 'gls_xyz123',
    };

    const promise = deleteGlossaryEntry(args, mockTranslator as any as Translator);
    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow("At least one of 'term' or 'guid' must be provided");
  });
});
