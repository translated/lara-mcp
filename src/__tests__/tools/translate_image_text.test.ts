import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateImageText, translateImageTextSchema } from '../../mcp/tools/translate_image_text.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

const validBase64 = Buffer.from('fake image bytes').toString('base64');

describe('translateImageTextSchema', () => {
  it('should validate valid input with required fields', () => {
    const input = { file_content: validBase64, target: 'it-IT' };
    expect(() => translateImageTextSchema.parse(input)).not.toThrow();
  });

  it('should validate valid input with all fields', () => {
    const input = {
      file_content: validBase64,
      source: 'en-EN',
      target: 'it-IT',
      adapt_to: ['mem_123'],
      glossaries: ['gls_abc123'],
      no_trace: true,
      style: 'faithful' as const,
    };
    expect(() => translateImageTextSchema.parse(input)).not.toThrow();
  });

  it('should reject missing required fields', () => {
    expect(() => translateImageTextSchema.parse({})).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      file_content: validBase64,
      target: 'it-IT',
      glossaries: ['bad'],
    };
    expect(() => translateImageTextSchema.parse(input)).toThrow();
  });
});

describe('translateImageText', () => {
  let mockTranslator: MockTranslator;
  const mockResult = {
    paragraphs: [
      { source: 'Hello', translation: 'Ciao' },
      { source: 'World', translation: 'Mondo' },
    ],
  };

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.images.translateText = vi.fn().mockResolvedValue(mockResult);
  });

  it('should call lara.images.translateText with correct parameters', async () => {
    const args = {
      file_content: validBase64,
      source: 'en-EN',
      target: 'it-IT',
    };

    const result = await translateImageText(args, mockTranslator as any as Translator);

    expect(mockTranslator.images.translateText).toHaveBeenCalledOnce();
    const [filePath, source, target] = mockTranslator.images.translateText.mock.calls[0];
    expect(typeof filePath).toBe('string');
    expect(source).toBe('en-EN');
    expect(target).toBe('it-IT');
    expect(result).toEqual(mockResult);
  });

  it('should pass null source when omitted', async () => {
    await translateImageText({
      file_content: validBase64,
      target: 'it-IT',
    }, mockTranslator as any as Translator);

    const [, source] = mockTranslator.images.translateText.mock.calls[0];
    expect(source).toBeNull();
  });

  it('should build options with all optional fields', async () => {
    await translateImageText({
      file_content: validBase64,
      target: 'it-IT',
      glossaries: ['gls_abc'],
      style: 'creative',
      adapt_to: ['mem_1'],
      no_trace: true,
    }, mockTranslator as any as Translator);

    const [, , , options] = mockTranslator.images.translateText.mock.calls[0];
    expect(options.glossaries).toEqual(['gls_abc']);
    expect(options.style).toBe('creative');
    expect(options.adaptTo).toEqual(['mem_1']);
    expect(options.noTrace).toBe(true);
  });

  it('should throw InvalidInputError for content exceeding 20MB', async () => {
    const largeContent = Buffer.alloc(21 * 1024 * 1024).toString('base64');

    await expect(translateImageText({
      file_content: largeContent,
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('Image too large');
  });

  it('should clean up temp files even on error', async () => {
    mockTranslator.images.translateText = vi.fn().mockRejectedValue(new Error('SDK error'));

    await expect(translateImageText({
      file_content: validBase64,
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('SDK error');
  });
});
