import { describe, it, expect, beforeEach } from 'vitest';
import { detectLanguage, detectLanguageSchema } from '../../mcp/tools/detect_language.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('detectLanguageSchema', () => {
  it('should validate a single string', () => {
    expect(() => detectLanguageSchema.parse({ text: 'Hello world' })).not.toThrow();
  });

  it('should validate an array of strings', () => {
    expect(() => detectLanguageSchema.parse({ text: ['Hello', 'World'] })).not.toThrow();
  });

  it('should validate an empty array', () => {
    expect(() => detectLanguageSchema.parse({ text: [] })).not.toThrow();
  });

  it('should reject an array exceeding 128 elements', () => {
    const text = Array.from({ length: 129 }, (_, i) => `text ${i}`);
    expect(() => detectLanguageSchema.parse({ text })).toThrow();
  });

  it('should validate with hint', () => {
    expect(() => detectLanguageSchema.parse({ text: 'Bonjour', hint: 'fr-FR' })).not.toThrow();
  });

  it('should validate with passlist', () => {
    expect(() => detectLanguageSchema.parse({ text: 'Bonjour', passlist: ['fr-FR', 'en-EN'] })).not.toThrow();
  });

  it('should reject invalid text type', () => {
    expect(() => detectLanguageSchema.parse({ text: 123 })).toThrow();
  });
});

describe('detectLanguage', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should detect language for a single string', async () => {
    const mockResult = {
      language: 'en-EN',
      contentType: 'text/plain',
      predictions: [
        { language: 'en-EN', confidence: 0.98 },
        { language: 'de-DE', confidence: 0.01 },
      ],
    };

    mockTranslator.detect.mockResolvedValue(mockResult);

    const result = await detectLanguage({ text: 'Hello world' }, mockTranslator as any as Translator);

    expect(mockTranslator.detect).toHaveBeenCalledWith('Hello world', undefined, undefined);
    expect(result).toEqual(mockResult);
  });

  it('should pass hint and passlist to the SDK', async () => {
    const mockResult = {
      language: 'fr-FR',
      contentType: 'text/plain',
      predictions: [{ language: 'fr-FR', confidence: 0.99 }],
    };

    mockTranslator.detect.mockResolvedValue(mockResult);

    const result = await detectLanguage(
      { text: 'Bonjour', hint: 'fr-FR', passlist: ['fr-FR', 'en-EN'] },
      mockTranslator as any as Translator,
    );

    expect(mockTranslator.detect).toHaveBeenCalledWith('Bonjour', 'fr-FR', ['fr-FR', 'en-EN']);
    expect(result).toEqual(mockResult);
  });

  it('should only pass defined optional params', async () => {
    const mockResult = {
      language: 'it-IT',
      contentType: 'text/plain',
      predictions: [{ language: 'it-IT', confidence: 0.95 }],
    };

    mockTranslator.detect.mockResolvedValue(mockResult);

    await detectLanguage({ text: 'Ciao mondo' }, mockTranslator as any as Translator);

    expect(mockTranslator.detect).toHaveBeenCalledWith('Ciao mondo', undefined, undefined);
  });

  it('should detect language for an array of strings', async () => {
    const mockResult = {
      language: 'es-ES',
      contentType: 'text/plain',
      predictions: [{ language: 'es-ES', confidence: 0.97 }],
    };

    mockTranslator.detect.mockResolvedValue(mockResult);

    const result = await detectLanguage(
      { text: ['Hola', 'Mundo'] },
      mockTranslator as any as Translator,
    );

    expect(mockTranslator.detect).toHaveBeenCalledWith(['Hola', 'Mundo'], undefined, undefined);
    expect(result).toEqual(mockResult);
  });
});
