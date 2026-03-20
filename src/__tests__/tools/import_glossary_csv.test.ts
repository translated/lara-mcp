import { describe, it, expect, beforeEach } from 'vitest';
import { importGlossaryCsv, importGlossaryCsvSchema } from '../../mcp/tools/import_glossary_csv.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('importGlossaryCsvSchema', () => {
  it('should validate valid input with all fields', () => {
    expect(() => importGlossaryCsvSchema.parse({
      id: 'gls_xyz123',
      csv_content: 'source,target\nhello,ciao',
      content_type: 'csv/table-multi',
      gzip: false,
    })).not.toThrow();
  });

  it('should validate with defaults', () => {
    const result = importGlossaryCsvSchema.parse({
      id: 'gls_xyz123',
      csv_content: 'source,target\nhello,ciao',
    });
    expect(result.content_type).toBe('csv/table-uni');
  });

  it('should reject missing id', () => {
    expect(() => importGlossaryCsvSchema.parse({
      csv_content: 'source,target\nhello,ciao',
    })).toThrow();
  });

  it('should reject missing csv_content', () => {
    expect(() => importGlossaryCsvSchema.parse({
      id: 'gls_xyz123',
    })).toThrow();
  });

  it('should reject invalid content_type', () => {
    expect(() => importGlossaryCsvSchema.parse({
      id: 'gls_xyz123',
      csv_content: 'source,target\nhello,ciao',
      content_type: 'invalid',
    })).toThrow();
  });
});

describe('importGlossaryCsv', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
    mockTranslator.glossaries.importCsv.mockResolvedValue({
      import_id: 'mock_import_id',
      status: 'queued',
    });
  });

  it('should call lara.glossaries.importCsv with correct parameters', async () => {
    const args = {
      id: 'gls_xyz123',
      csv_content: 'source,target\nhello,ciao',
      content_type: 'csv/table-multi',
    };

    await importGlossaryCsv(args, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.importCsv).toHaveBeenCalledWith(
      'gls_xyz123',
      expect.stringContaining('import.csv'),
      'csv/table-multi',
      undefined,
    );
  });

  it('should throw error for CSV content exceeding 5MB', async () => {
    const largeContent = 'a'.repeat(6 * 1024 * 1024);

    await expect(importGlossaryCsv({
      id: 'gls_xyz123',
      csv_content: largeContent,
    }, mockTranslator as any as Translator)).rejects.toThrow('CSV file too large');
  });
});
