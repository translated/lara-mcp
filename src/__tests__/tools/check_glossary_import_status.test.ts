import { describe, it, expect, beforeEach } from 'vitest';
import { checkGlossaryImportStatus, checkGlossaryImportStatusSchema } from '../../mcp/tools/check_glossary_import_status.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('checkGlossaryImportStatusSchema', () => {
  it('should validate correct input', () => {
    expect(() => checkGlossaryImportStatusSchema.parse({ id: 'import_job_123' })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => checkGlossaryImportStatusSchema.parse({})).toThrow();
  });
});

describe('checkGlossaryImportStatus', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.glossaries.getImportStatus with correct id', async () => {
    const mockResult = { import_id: 'import_job_123', status: 'completed' };
    mockTranslator.glossaries.getImportStatus.mockResolvedValue(mockResult);

    const result = await checkGlossaryImportStatus({ id: 'import_job_123' }, mockTranslator as any as Translator);

    expect(mockTranslator.glossaries.getImportStatus).toHaveBeenCalledWith('import_job_123');
    expect(result).toEqual(mockResult);
  });
});
