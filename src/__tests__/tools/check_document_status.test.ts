import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDocumentStatus, checkDocumentStatusSchema } from '../../mcp/tools/check_document_status.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

setupTranslatorMock();

describe('checkDocumentStatusSchema', () => {
  it('should validate valid input', () => {
    expect(() => checkDocumentStatusSchema.parse({ id: 'doc_123' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => checkDocumentStatusSchema.parse({})).toThrow();
  });

  it('should reject empty id', () => {
    expect(() => checkDocumentStatusSchema.parse({ id: '' })).toThrow();
  });
});

describe('checkDocumentStatus', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.documents.status = vi.fn().mockResolvedValue({
      id: 'doc_123',
      status: 'translating',
      translatedChars: 500,
      totalChars: 1000,
    });
  });

  it('should call lara.documents.status with correct ID', async () => {
    const result = await checkDocumentStatus({ id: 'doc_123' }, mockTranslator as any as Translator);

    expect(mockTranslator.documents.status).toHaveBeenCalledWith('doc_123');
    expect(result).toEqual({
      id: 'doc_123',
      status: 'translating',
      translatedChars: 500,
      totalChars: 1000,
    });
  });
});
