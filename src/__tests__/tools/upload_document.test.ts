import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadDocument, uploadDocumentSchema } from '../../mcp/tools/upload_document.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

const validBase64 = Buffer.from('hello world').toString('base64');

describe('uploadDocumentSchema', () => {
  it('should validate valid input with required fields', () => {
    const input = { file_content: validBase64, filename: 'doc.docx', target: 'it-IT' };
    expect(() => uploadDocumentSchema.parse(input)).not.toThrow();
  });

  it('should validate valid input with all optional fields', () => {
    const input = {
      file_content: validBase64,
      filename: 'doc.docx',
      source: 'en-EN',
      target: 'it-IT',
      adapt_to: ['mem_123'],
      glossaries: ['gls_abc123'],
      no_trace: true,
      style: 'faithful' as const,
      password: 'secret',
      extract_comments: true,
      accept_revisions: false,
    };
    expect(() => uploadDocumentSchema.parse(input)).not.toThrow();
  });

  it('should reject missing file_content', () => {
    expect(() => uploadDocumentSchema.parse({ filename: 'doc.docx', target: 'it-IT' })).toThrow();
  });

  it('should reject missing filename', () => {
    expect(() => uploadDocumentSchema.parse({ file_content: validBase64, target: 'it-IT' })).toThrow();
  });

  it('should reject missing target', () => {
    expect(() => uploadDocumentSchema.parse({ file_content: validBase64, filename: 'doc.docx' })).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      glossaries: ['invalid_id'],
    };
    expect(() => uploadDocumentSchema.parse(input)).toThrow();
  });

  it('should reject more than 10 glossaries', () => {
    const input = {
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      glossaries: Array.from({ length: 11 }, (_, i) => `gls_id${i}`),
    };
    expect(() => uploadDocumentSchema.parse(input)).toThrow();
  });
});

describe('uploadDocument', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.documents.upload = vi.fn().mockResolvedValue({
      id: 'doc_123',
      status: 'initialized',
      filename: 'doc.docx',
      target: 'it-IT',
    });
  });

  it('should call lara.documents.upload with correct parameters', async () => {
    const args = {
      file_content: validBase64,
      filename: 'report.docx',
      source: 'en-EN',
      target: 'it-IT',
    };

    const result = await uploadDocument(args, mockTranslator as any as Translator);

    expect(mockTranslator.documents.upload).toHaveBeenCalledOnce();
    const [filePath, filename, source, target, options] = mockTranslator.documents.upload.mock.calls[0];
    expect(typeof filePath).toBe('string');
    expect(filename).toBe('report.docx');
    expect(source).toBe('en-EN');
    expect(target).toBe('it-IT');
    expect(result).toEqual({ id: 'doc_123', status: 'initialized', filename: 'doc.docx', target: 'it-IT' });
  });

  it('should pass null source when omitted', async () => {
    const args = { file_content: validBase64, filename: 'doc.docx', target: 'it-IT' };
    await uploadDocument(args, mockTranslator as any as Translator);

    const [, , source] = mockTranslator.documents.upload.mock.calls[0];
    expect(source).toBeNull();
  });

  it('should build options with glossaries and style', async () => {
    const args = {
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      glossaries: ['gls_abc'],
      style: 'creative',
    };

    await uploadDocument(args, mockTranslator as any as Translator);
    const [, , , , options] = mockTranslator.documents.upload.mock.calls[0];
    expect(options.glossaries).toEqual(['gls_abc']);
    expect(options.style).toBe('creative');
  });

  it('should build extractionParams for DOCX options', async () => {
    const args = {
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
      extract_comments: true,
      accept_revisions: true,
    };

    await uploadDocument(args, mockTranslator as any as Translator);
    const [, , , , options] = mockTranslator.documents.upload.mock.calls[0];
    expect(options.extractionParams).toEqual({ extractComments: true, acceptRevisions: true });
  });

  it('should throw InvalidInputError for content exceeding 20MB', async () => {
    const largeContent = Buffer.alloc(21 * 1024 * 1024).toString('base64');

    await expect(uploadDocument({
      file_content: largeContent,
      filename: 'large.docx',
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('Document too large');
  });

  it('should clean up temp files even on error', async () => {
    mockTranslator.documents.upload = vi.fn().mockRejectedValue(new Error('SDK error'));

    await expect(uploadDocument({
      file_content: validBase64,
      filename: 'doc.docx',
      target: 'it-IT',
    }, mockTranslator as any as Translator)).rejects.toThrow('SDK error');
  });
});
