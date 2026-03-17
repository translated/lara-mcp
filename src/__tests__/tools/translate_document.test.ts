import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateDocument, translateDocumentSchema } from '../../mcp/tools/translate_document.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

const validBase64 = Buffer.from('hello world').toString('base64');

describe('translateDocumentSchema', () => {
  it('should validate valid input with required fields', () => {
    const input = { file_content: validBase64, filename: 'doc.docx', target: 'it-IT' };
    expect(() => translateDocumentSchema.parse(input)).not.toThrow();
  });

  it('should validate valid input with all fields', () => {
    const input = {
      file_content: validBase64,
      filename: 'doc.docx',
      source: 'en-EN',
      target: 'it-IT',
      adapt_to: ['mem_123'],
      glossaries: ['gls_abc123'],
      no_trace: true,
      style: 'fluid' as const,
      password: 'secret',
      extract_comments: true,
      accept_revisions: false,
      output_format: 'pdf' as const,
    };
    expect(() => translateDocumentSchema.parse(input)).not.toThrow();
  });

  it('should reject missing required fields', () => {
    expect(() => translateDocumentSchema.parse({})).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      glossaries: ['bad'],
    };
    expect(() => translateDocumentSchema.parse(input)).toThrow();
  });
});

describe('translateDocument', () => {
  let mockTranslator: MockTranslator;
  const translatedContent = 'translated content bytes';
  const translatedBuffer = Buffer.from(translatedContent);

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.documents.translate = vi.fn().mockResolvedValue(translatedBuffer);
  });

  it('should call lara.documents.translate with correct parameters', async () => {
    const args = {
      file_content: validBase64,
      filename: 'report.docx',
      source: 'en-EN',
      target: 'it-IT',
    };

    const result = await translateDocument(args, mockTranslator as any as Translator);

    expect(mockTranslator.documents.translate).toHaveBeenCalledOnce();
    const [filePath, filename, source, target] = mockTranslator.documents.translate.mock.calls[0];
    expect(typeof filePath).toBe('string');
    expect(filename).toBe('report.docx');
    expect(source).toBe('en-EN');
    expect(target).toBe('it-IT');

    // Verify base64 round-trip
    const decoded = Buffer.from(result.content, 'base64').toString();
    expect(decoded).toBe(translatedContent);
    expect(result.filename).toBe('report.docx');
  });

  it('should pass null source when omitted', async () => {
    await translateDocument({
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
    }, mockTranslator as any as Translator);

    const [, , source] = mockTranslator.documents.translate.mock.calls[0];
    expect(source).toBeNull();
  });

  it('should build options with all optional fields', async () => {
    await translateDocument({
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      glossaries: ['gls_abc'],
      style: 'creative',
      output_format: 'pdf',
      extract_comments: true,
    }, mockTranslator as any as Translator);

    const [, , , , options] = mockTranslator.documents.translate.mock.calls[0];
    expect(options.glossaries).toEqual(['gls_abc']);
    expect(options.style).toBe('creative');
    expect(options.outputFormat).toBe('pdf');
    expect(options.extractionParams).toEqual({ extractComments: true });
  });

  it('should throw InvalidInputError for content exceeding 20MB', async () => {
    const largeContent = Buffer.alloc(21 * 1024 * 1024).toString('base64');

    await expect(translateDocument({
      file_content: largeContent,
      filename: 'large.docx',
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('Document too large');
  });

  it('should clean up temp files even on error', async () => {
    mockTranslator.documents.translate = vi.fn().mockRejectedValue(new Error('SDK error'));

    await expect(translateDocument({
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('SDK error');
  });
});
