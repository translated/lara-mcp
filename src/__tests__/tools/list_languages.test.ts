import { describe, it, expect, beforeEach } from 'vitest';
import { listLanguages, listLanguagesSchema } from '../../tools/list_languages.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('listLanguagesSchema', () => {
  it('should validate empty object', () => {
    expect(() => listLanguagesSchema.parse({})).not.toThrow();
  });
});

describe('listLanguages', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.getLanguages and return the result', async () => {
    const mockLanguages = [
      { code: 'en-US', name: 'English (US)' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'fr-FR', name: 'French' }
    ];

    mockTranslator.getLanguages.mockResolvedValue(mockLanguages);

    const result = await listLanguages(mockTranslator as any as Translator);

    expect(mockTranslator.getLanguages).toHaveBeenCalled();
    expect(result).toEqual(mockLanguages);
  });
}); 