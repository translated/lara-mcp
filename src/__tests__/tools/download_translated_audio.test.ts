import { describe, it, expect, beforeEach, vi } from 'vitest';
import { downloadTranslatedAudio, downloadTranslatedAudioSchema } from '../../mcp/tools/download_translated_audio.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import { PassThrough } from 'stream';

// Setup mocks
setupTranslatorMock();

describe('downloadTranslatedAudioSchema', () => {
  it('should validate valid input', () => {
    expect(() => downloadTranslatedAudioSchema.parse({
      id: 'audio_123',
    })).not.toThrow();
  });

  it('should reject missing id', () => {
    expect(() => downloadTranslatedAudioSchema.parse({})).toThrow();
  });
});

describe('downloadTranslatedAudio', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslator = getMockTranslator();
  });

  it('should download audio and return base64 content', async () => {
    const audioData = Buffer.from('translated audio data');
    const mockStream = new PassThrough();
    mockStream.end(audioData);
    mockTranslator.audio.download.mockResolvedValue(mockStream);

    const result = await downloadTranslatedAudio(
      { id: 'audio_123' },
      mockTranslator as any as Translator
    );

    expect(mockTranslator.audio.download).toHaveBeenCalledWith('audio_123');
    expect(result).toEqual({
      content: audioData.toString('base64'),
    });
  });

  it('should handle empty stream', async () => {
    const mockStream = new PassThrough();
    mockStream.end();
    mockTranslator.audio.download.mockResolvedValue(mockStream);

    const result = await downloadTranslatedAudio(
      { id: 'audio_456' },
      mockTranslator as any as Translator
    );

    expect(result).toEqual({
      content: '',
    });
  });
});
