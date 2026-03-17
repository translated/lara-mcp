import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadDocument, downloadDocumentSchema } from '../../mcp/tools/download_document.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

describe('downloadDocumentSchema', () => {
  it('should validate valid input with id only', () => {
    expect(() => downloadDocumentSchema.parse({ id: 'doc_123' })).not.toThrow();
  });

  it('should validate valid input with output_format', () => {
    expect(() => downloadDocumentSchema.parse({ id: 'doc_123', output_format: 'pdf' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => downloadDocumentSchema.parse({})).toThrow();
  });

  it('should reject invalid output_format', () => {
    expect(() => downloadDocumentSchema.parse({ id: 'doc_123', output_format: 'docx' })).toThrow();
  });
});

describe('downloadDocument', () => {
  let mockTranslator: MockTranslator;
  const testContent = 'translated file content';
  const testBuffer = Buffer.from(testContent);

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.documents.download = vi.fn().mockResolvedValue(testBuffer);
  });

  it('should call lara.documents.download with correct params', async () => {
    const result = await downloadDocument({ id: 'doc_123' }, mockTranslator as any as Translator);

    expect(mockTranslator.documents.download).toHaveBeenCalledWith('doc_123', {});
    expect(result.content).toBe(testBuffer.toString('base64'));
  });

  it('should pass output_format option', async () => {
    await downloadDocument({ id: 'doc_123', output_format: 'pdf' }, mockTranslator as any as Translator);

    expect(mockTranslator.documents.download).toHaveBeenCalledWith('doc_123', { outputFormat: 'pdf' });
  });

  it('should return base64-encoded content', async () => {
    const result = await downloadDocument({ id: 'doc_123' }, mockTranslator as any as Translator);

    // Verify round-trip
    const decoded = Buffer.from(result.content, 'base64').toString();
    expect(decoded).toBe(testContent);
  });
});
