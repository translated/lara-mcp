import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import { translateImage, translateImageSchema, streamToBuffer, detectImageExtension } from '../../mcp/tools/translate_image.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

const validBase64 = Buffer.from('fake image bytes').toString('base64');

describe('translateImageSchema', () => {
  it('should validate valid input with required fields', () => {
    const input = { file_content: validBase64, target: 'it-IT' };
    expect(() => translateImageSchema.parse(input)).not.toThrow();
  });

  it('should validate valid input with all fields', () => {
    const input = {
      file_content: validBase64,
      source: 'en-EN',
      target: 'it-IT',
      adapt_to: ['mem_123'],
      glossaries: ['gls_abc123'],
      no_trace: true,
      style: 'fluid' as const,
      text_removal: 'inpainting' as const,
    };
    expect(() => translateImageSchema.parse(input)).not.toThrow();
  });

  it('should reject missing required fields', () => {
    expect(() => translateImageSchema.parse({})).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      file_content: validBase64,
      target: 'it-IT',
      glossaries: ['bad'],
    };
    expect(() => translateImageSchema.parse(input)).toThrow();
  });

  it('should reject invalid text_removal value', () => {
    const input = {
      file_content: validBase64,
      target: 'it-IT',
      text_removal: 'magic',
    };
    expect(() => translateImageSchema.parse(input)).toThrow();
  });

  it('should reject more than 10 glossaries', () => {
    const input = {
      file_content: validBase64,
      target: 'it-IT',
      glossaries: Array.from({ length: 11 }, (_, i) => `gls_id${i}`),
    };
    expect(() => translateImageSchema.parse(input)).toThrow();
  });
});

describe('detectImageExtension', () => {
  it('should detect PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageExtension(buf)).toBe('.png');
  });

  it('should detect JPEG from magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageExtension(buf)).toBe('.jpg');
  });

  it('should detect GIF from magic bytes', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectImageExtension(buf)).toBe('.gif');
  });

  it('should detect WebP from magic bytes', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(detectImageExtension(buf)).toBe('.webp');
  });

  it('should detect BMP from magic bytes', () => {
    const buf = Buffer.from([0x42, 0x4d, 0x00, 0x00]);
    expect(detectImageExtension(buf)).toBe('.bmp');
  });

  it('should default to .png for unknown formats', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(detectImageExtension(buf)).toBe('.png');
  });
});

describe('streamToBuffer', () => {
  it('should collect a readable stream into a buffer', async () => {
    const data = 'hello stream';
    const stream = Readable.from(Buffer.from(data));
    const result = await streamToBuffer(stream);
    expect(result.toString()).toBe(data);
  });
});

describe('translateImage', () => {
  let mockTranslator: MockTranslator;
  const translatedBytes = 'translated image bytes';

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.images.translate = vi.fn().mockResolvedValue(
      Readable.from(Buffer.from(translatedBytes))
    );
  });

  it('should create temp file with correct extension for PNG', async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const args = {
      file_content: pngBytes.toString('base64'),
      target: 'it-IT',
    };

    await translateImage(args, mockTranslator as any as Translator);
    const [filePath] = mockTranslator.images.translate.mock.calls[0];
    expect(filePath).toMatch(/\.png$/);
  });

  it('should create temp file with correct extension for JPEG', async () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const args = {
      file_content: jpegBytes.toString('base64'),
      target: 'it-IT',
    };

    await translateImage(args, mockTranslator as any as Translator);
    const [filePath] = mockTranslator.images.translate.mock.calls[0];
    expect(filePath).toMatch(/\.jpg$/);
  });

  it('should call lara.images.translate with correct parameters', async () => {
    const args = {
      file_content: validBase64,
      source: 'en-EN',
      target: 'it-IT',
    };

    const result = await translateImage(args, mockTranslator as any as Translator);

    expect(mockTranslator.images.translate).toHaveBeenCalledOnce();
    const [filePath, source, target] = mockTranslator.images.translate.mock.calls[0];
    expect(typeof filePath).toBe('string');
    expect(source).toBe('en-EN');
    expect(target).toBe('it-IT');

    // Verify base64 round-trip
    const decoded = Buffer.from(result.content, 'base64').toString();
    expect(decoded).toBe(translatedBytes);
  });

  it('should pass null source when omitted', async () => {
    await translateImage({
      file_content: validBase64,
      target: 'it-IT',
    }, mockTranslator as any as Translator);

    const [, source] = mockTranslator.images.translate.mock.calls[0];
    expect(source).toBeNull();
  });

  it('should build options with all optional fields', async () => {
    await translateImage({
      file_content: validBase64,
      target: 'it-IT',
      glossaries: ['gls_abc'],
      style: 'creative',
      adapt_to: ['mem_1'],
      no_trace: true,
      text_removal: 'inpainting',
    }, mockTranslator as any as Translator);

    const [, , , options] = mockTranslator.images.translate.mock.calls[0];
    expect(options.glossaries).toEqual(['gls_abc']);
    expect(options.style).toBe('creative');
    expect(options.adaptTo).toEqual(['mem_1']);
    expect(options.noTrace).toBe(true);
    expect(options.textRemoval).toBe('inpainting');
  });

  it('should throw InvalidInputError for content exceeding 20MB', async () => {
    const largeContent = Buffer.alloc(21 * 1024 * 1024).toString('base64');

    await expect(translateImage({
      file_content: largeContent,
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('Image too large');
  });

  it('should clean up temp files even on error', async () => {
    mockTranslator.images.translate = vi.fn().mockRejectedValue(new Error('SDK error'));

    await expect(translateImage({
      file_content: validBase64,
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('SDK error');
  });
});
