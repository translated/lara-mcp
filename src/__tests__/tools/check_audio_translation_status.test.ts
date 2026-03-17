import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAudioTranslationStatus, checkAudioTranslationStatusSchema } from '../../mcp/tools/check_audio_translation_status.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('checkAudioTranslationStatusSchema', () => {
  it('should validate valid input', () => {
    expect(() => checkAudioTranslationStatusSchema.parse({ id: 'audio_123' })).not.toThrow();
  });

  it('should reject input with missing id', () => {
    expect(() => checkAudioTranslationStatusSchema.parse({})).toThrow();
  });
});

describe('checkAudioTranslationStatus', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.audio.status with correct ID', async () => {
    const mockResult = {
      id: 'audio_123',
      status: 'translating',
      translatedSeconds: 30,
      totalSeconds: 120,
      target: 'it-IT',
      filename: 'audio.mp3',
    };
    mockTranslator.audio.status.mockResolvedValue(mockResult);

    const result = await checkAudioTranslationStatus(
      { id: 'audio_123' },
      mockTranslator as any as Translator
    );

    expect(mockTranslator.audio.status).toHaveBeenCalledWith('audio_123');
    expect(result).toEqual(mockResult);
  });
});
