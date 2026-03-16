import { describe, it, expect, beforeEach } from 'vitest';
import { exportGlossary, exportGlossarySchema } from '../../mcp/tools/export_glossary.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('exportGlossarySchema', () => {
  it('should validate correct input with source', () => {
    expect(() => exportGlossarySchema.parse({
      id: 'gls_xyz123',
      content_type: 'csv/table-uni',
      source: 'en',
    })).not.toThrow();
  });

  it('should validate correct input without source', () => {
    expect(() => exportGlossarySchema.parse({
      id: 'gls_xyz123',
      content_type: 'csv/table-multi',
    })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => exportGlossarySchema.parse({
      content_type: 'csv/table-uni',
    })).toThrow();
  });

  it('should reject missing content_type', () => {
    expect(() => exportGlossarySchema.parse({
      id: 'gls_xyz123',
    })).toThrow();
  });

  it('should reject invalid content_type', () => {
    expect(() => exportGlossarySchema.parse({
      id: 'gls_xyz123',
      content_type: 'invalid',
    })).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    expect(() => exportGlossarySchema.parse({
      id: 'invalid-id',
      content_type: 'csv/table-uni',
    })).toThrow();
  });
});

describe('exportGlossary', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.export with correct params', async () => {
    const mockCsv = 'source,target\nhello,ciao';
    mockTranslator.glossaries.export.mockResolvedValue(mockCsv);

    const result = await exportGlossary({
      id: 'gls_xyz123',
      content_type: 'csv/table-uni',
      source: 'en',
    }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.export).toHaveBeenCalledWith('gls_xyz123', 'csv/table-uni', 'en');
    expect(result).toBe(mockCsv);
  });

  it('should call lara.glossaries.export without source when not provided', async () => {
    mockTranslator.glossaries.export.mockResolvedValue('col1,col2');

    await exportGlossary({
      id: 'gls_xyz123',
      content_type: 'csv/table-multi',
    }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.export).toHaveBeenCalledWith('gls_xyz123', 'csv/table-multi', undefined);
  });
});
