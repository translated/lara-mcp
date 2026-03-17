import { describe, it, expect, beforeEach, vi } from 'vitest';
import { downloadTranslatedAudio, downloadTranslatedAudioSchema } from '../../mcp/tools/download_translated_audio.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import * as fs from 'fs';
import { PassThrough } from 'stream';

// Setup mocks
setupTranslatorMock();

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    accessSync: vi.fn(),
    createWriteStream: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

vi.mock('stream/promises', () => ({
  pipeline: vi.fn(),
}));

describe('downloadTranslatedAudioSchema', () => {
  it('should validate valid input', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      id: 'audio_123',
      output_path: '/tmp/translated.mp3',
    })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      output_path: '/tmp/translated.mp3',
    })).toThrow();
  });

  it('should reject missing output_path', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      id: 'audio_123',
    })).toThrow();
  });

  it('should reject relative output_path', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      id: 'audio_123',
      output_path: 'relative/translated.mp3',
    })).toThrow();
  });

  it('should reject output_path with ".." segments', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      id: 'audio_123',
      output_path: '/tmp/../etc/translated.mp3',
    })).toThrow();
  });
});

describe('downloadTranslatedAudio', () => {
  let mockTranslator: MockTranslator;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTranslator = getMockTranslator();
    vi.mocked(fs.accessSync).mockImplementation(() => undefined);
    vi.mocked(fs.renameSync).mockImplementation(() => undefined);

    const { pipeline } = await import('stream/promises');
    vi.mocked(pipeline).mockResolvedValue(undefined);
  });

  it('should download and save audio file via temp file', async () => {
    const mockStream = new PassThrough();
    mockTranslator.audio.download.mockResolvedValue(mockStream);

    const mockWriteStream = new PassThrough();
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

    const result = await downloadTranslatedAudio(
      { id: 'audio_123', output_path: '/tmp/translated.mp3' },
      mockTranslator as any as Translator
    );

    expect(mockTranslator.audio.download).toHaveBeenCalledWith('audio_123');
    // Should write to a temp file, then rename
    expect(fs.createWriteStream).toHaveBeenCalledWith(expect.stringMatching(/^\/tmp\/\.lara-download-[a-f0-9]+\.tmp$/));
    expect(fs.renameSync).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/\.lara-download-[a-f0-9]+\.tmp$/),
      '/tmp/translated.mp3'
    );
    expect(result).toEqual({
      output_path: '/tmp/translated.mp3',
      message: 'Translated audio saved successfully.',
    });
  });

  it('should throw on unwritable output directory', async () => {
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error('EACCES');
    });

    await expect(
      downloadTranslatedAudio(
        { id: 'audio_123', output_path: '/readonly/translated.mp3' },
        mockTranslator as any as Translator
      )
    ).rejects.toThrow('Output directory not found or not writable');
  });

  it('should clean up temp file on pipeline error without deleting target', async () => {
    const mockStream = new PassThrough();
    mockTranslator.audio.download.mockResolvedValue(mockStream);

    const mockWriteStream = new PassThrough();
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

    const { pipeline } = await import('stream/promises');
    vi.mocked(pipeline).mockRejectedValue(new Error('Stream error'));

    await expect(
      downloadTranslatedAudio(
        { id: 'audio_123', output_path: '/tmp/translated.mp3' },
        mockTranslator as any as Translator
      )
    ).rejects.toThrow('Stream error');

    // Should clean up the temp file, not the target path
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/^\/tmp\/\.lara-download-[a-f0-9]+\.tmp$/));
    expect(fs.unlinkSync).not.toHaveBeenCalledWith('/tmp/translated.mp3');
    expect(fs.renameSync).not.toHaveBeenCalled();
  });
});
