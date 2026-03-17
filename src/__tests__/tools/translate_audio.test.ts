import { describe, it, expect, beforeEach, vi } from 'vitest';
import { translateAudio, translateAudioSchema } from '../../mcp/tools/translate_audio.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import * as fs from 'fs';

// Setup mocks
setupTranslatorMock();

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    mkdtempSync: vi.fn(() => '/tmp/lara-audio-abc123'),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

const VALID_BASE64 = Buffer.from('fake audio content').toString('base64');

describe('translateAudioSchema', () => {
  it('should validate valid input with all fields', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      source: 'en-EN',
      adapt_to: ['mem_123'],
      glossaries: ['gls_abc123'],
      no_trace: true,
      style: 'faithful',
      voice_gender: 'female',
    };

    expect(() => translateAudioSchema.parse(input)).not.toThrow();
  });

  it('should validate valid input with only required fields', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
    };

    expect(() => translateAudioSchema.parse(input)).not.toThrow();
  });

  it('should reject missing file_content', () => {
    const input = { filename: 'audio.mp3', target: 'it-IT' };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject missing filename', () => {
    const input = { file_content: VALID_BASE64, target: 'it-IT' };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject missing target', () => {
    const input = { file_content: VALID_BASE64, filename: 'audio.mp3' };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      glossaries: ['invalid_id'],
    };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject more than 10 glossaries', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      glossaries: Array.from({ length: 11 }, (_, i) => `gls_id${i}`),
    };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject invalid style value', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      style: 'invalid',
    };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject invalid voice_gender value', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      voice_gender: 'other',
    };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });

  it('should reject empty filename', () => {
    const input = {
      file_content: VALID_BASE64,
      filename: '',
      target: 'it-IT',
    };
    expect(() => translateAudioSchema.parse(input)).toThrow();
  });
});

describe('translateAudio', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.audio.upload with correct args', async () => {
    const mockResult = {
      id: 'audio_123',
      status: 'initialized',
      target: 'it-IT',
      filename: 'audio.mp3',
    };
    mockTranslator.audio.upload.mockResolvedValue(mockResult);

    const args = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      source: 'en-EN',
    };

    const result = await translateAudio(args, mockTranslator as any as Translator);

    expect(mockTranslator.audio.upload).toHaveBeenCalledWith(
      '/tmp/lara-audio-abc123/upload',
      'audio.mp3',
      'en-EN',
      'it-IT',
      {}
    );
    expect(result).toEqual(mockResult);
  });

  it('should pass source as null when not provided', async () => {
    const mockResult = { id: 'audio_123', status: 'initialized', target: 'it-IT', filename: 'audio.mp3' };
    mockTranslator.audio.upload.mockResolvedValue(mockResult);

    await translateAudio({ file_content: VALID_BASE64, filename: 'audio.mp3', target: 'it-IT' }, mockTranslator as any as Translator);

    expect(mockTranslator.audio.upload).toHaveBeenCalledWith(
      '/tmp/lara-audio-abc123/upload',
      'audio.mp3',
      null,
      'it-IT',
      {}
    );
  });

  it('should build options only with defined values', async () => {
    mockTranslator.audio.upload.mockResolvedValue({ id: 'audio_123' });

    const args = {
      file_content: VALID_BASE64,
      filename: 'audio.mp3',
      target: 'it-IT',
      glossaries: ['gls_abc'],
      style: 'fluid',
      voice_gender: 'male',
      no_trace: true,
      adapt_to: ['mem_1'],
    };

    await translateAudio(args, mockTranslator as any as Translator);

    expect(mockTranslator.audio.upload).toHaveBeenCalledWith(
      '/tmp/lara-audio-abc123/upload',
      'audio.mp3',
      null,
      'it-IT',
      {
        glossaries: ['gls_abc'],
        style: 'fluid',
        voiceGender: 'male',
        noTrace: true,
        adaptTo: ['mem_1'],
      }
    );
  });

  it('should write decoded content to temp file and clean up', async () => {
    mockTranslator.audio.upload.mockResolvedValue({ id: 'audio_123' });

    await translateAudio(
      { file_content: VALID_BASE64, filename: 'audio.mp3', target: 'it-IT' },
      mockTranslator as any as Translator
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/lara-audio-abc123/upload',
      expect.any(Buffer),
      { mode: 0o600 }
    );
    expect(fs.rmSync).toHaveBeenCalledWith(
      '/tmp/lara-audio-abc123',
      { recursive: true, force: true }
    );
  });
});
