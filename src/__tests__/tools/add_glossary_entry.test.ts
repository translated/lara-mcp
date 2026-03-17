import { describe, it, expect, beforeEach } from 'vitest';
import { addGlossaryEntry, addGlossaryEntrySchema } from '../../mcp/tools/add_glossary_entry.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('addGlossaryEntrySchema', () => {
  it('should validate correct input with required fields', () => {
    const input = {
      id: 'gls_xyz123',
      terms: [{ language: 'en-US', value: 'Hello' }],
    };
    expect(() => addGlossaryEntrySchema.parse(input)).not.toThrow();
  });

  it('should validate correct input with optional guid', () => {
    const input = {
      id: 'gls_xyz123',
      terms: [{ language: 'en-US', value: 'Hello' }, { language: 'it-IT', value: 'Ciao' }],
      guid: 'entry-123',
    };
    expect(() => addGlossaryEntrySchema.parse(input)).not.toThrow();
  });

  it('should reject missing id', () => {
    const input = {
      terms: [{ language: 'en-US', value: 'Hello' }],
    };
    expect(() => addGlossaryEntrySchema.parse(input)).toThrow();
  });

  it('should reject empty terms array', () => {
    const input = {
      id: 'gls_xyz123',
      terms: [],
    };
    expect(() => addGlossaryEntrySchema.parse(input)).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      id: 'invalid-id',
      terms: [{ language: 'en-US', value: 'Hello' }],
    };
    expect(() => addGlossaryEntrySchema.parse(input)).toThrow();
  });
});

describe('addGlossaryEntry', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.addOrReplaceEntry without guid', async () => {
    const mockResult = { id: 'imp_abc', status: 'pending' };
    mockTranslator.glossaries.addOrReplaceEntry.mockResolvedValue(mockResult);

    const args = {
      id: 'gls_xyz123',
      terms: [{ language: 'en-US', value: 'Hello' }, { language: 'it-IT', value: 'Ciao' }],
    };

    const result = await addGlossaryEntry(args, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.addOrReplaceEntry).toHaveBeenCalledWith(
      'gls_xyz123',
      args.terms
    );
    expect(result).toEqual(mockResult);
  });

  it('should call lara.glossaries.addOrReplaceEntry with guid when provided', async () => {
    const mockResult = { id: 'imp_abc', status: 'pending' };
    mockTranslator.glossaries.addOrReplaceEntry.mockResolvedValue(mockResult);

    const args = {
      id: 'gls_xyz123',
      terms: [{ language: 'en-US', value: 'Hello' }],
      guid: 'entry-123',
    };

    const result = await addGlossaryEntry(args, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.addOrReplaceEntry).toHaveBeenCalledWith(
      'gls_xyz123',
      args.terms,
      'entry-123'
    );
    expect(result).toEqual(mockResult);
  });
});
