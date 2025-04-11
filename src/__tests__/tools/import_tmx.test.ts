import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importTmx, importTmxSchema } from '../../tools/import_tmx.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import * as fs from 'fs';

// Mock fs.createReadStream
vi.mock('fs', () => ({
  createReadStream: vi.fn(() => 'mock_file_stream')
}));

// Setup mocks
setupTranslatorMock();

describe('importTmxSchema', () => {
  it('should validate valid input', () => {
    const validInput = {
      id: 'mem_xyz123',
      tmx: '/path/to/file.tmx'
    };

    expect(() => importTmxSchema.parse(validInput)).not.toThrow();
  });

  it('should validate input with optional gzip', () => {
    const validInput = {
      id: 'mem_xyz123',
      tmx: '/path/to/file.tmx.gz',
      gzip: true
    };

    expect(() => importTmxSchema.parse(validInput)).not.toThrow();
  });

  it('should reject input with missing required fields', () => {
    const invalidInput = {
      id: 'mem_xyz123'
      // Missing tmx
    };

    expect(() => importTmxSchema.parse(invalidInput)).toThrow();
  });
});

describe('importTmx', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();

    // Reset mocks
    vi.mocked(fs.createReadStream).mockClear();
  });

  it('should call lara.memories.importTmx with correct parameters', async () => {
    const mockResult = {
      import_id: 'import_123',
      status: 'queued'
    };
    mockTranslator.memories.importTmx.mockResolvedValue(mockResult);

    const args = {
      id: 'mem_xyz123',
      tmx: '/path/to/file.tmx'
    };

    const result = await importTmx(args, mockTranslator as any as Translator);

    // Check file stream creation
    expect(fs.createReadStream).toHaveBeenCalledWith(args.tmx);

    // Check importTmx call
    expect(mockTranslator.memories.importTmx).toHaveBeenCalledWith(
      args.id,
      'mock_file_stream',
      false
    );

    expect(result).toEqual(mockResult);
  });

  it('should pass gzip flag when provided', async () => {
    const mockResult = {
      import_id: 'import_123',
      status: 'queued'
    };
    mockTranslator.memories.importTmx.mockResolvedValue(mockResult);

    const args = {
      id: 'mem_xyz123',
      tmx: '/path/to/file.tmx.gz',
      gzip: true
    };

    await importTmx(args, mockTranslator as any as Translator);

    expect(mockTranslator.memories.importTmx).toHaveBeenCalledWith(
      args.id,
      'mock_file_stream',
      true
    );
  });
}); 