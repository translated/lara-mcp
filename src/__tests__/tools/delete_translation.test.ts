import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteTranslation, deleteTranslationSchema } from '../../tools/delete_translation.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('deleteTranslationSchema', () => {
  it('should validate valid input with required fields', () => {
    const validInput = {
      id: ['mem_xyz123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello world',
      translation: 'Ciao mondo'
    };

    expect(() => deleteTranslationSchema.parse(validInput)).not.toThrow();
  });

  it('should validate input with all optional fields', () => {
    const validInput = {
      id: ['mem_xyz123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello world',
      translation: 'Ciao mondo',
      tuid: 'translation-123',
      sentence_before: 'How are you?',
      sentence_after: 'How is the weather?'
    };

    expect(() => deleteTranslationSchema.parse(validInput)).not.toThrow();
  });

  it('should reject input with missing required fields', () => {
    const invalidInput = {
      id: ['mem_xyz123'],
      source: 'en-US',
      // Missing target
      sentence: 'Hello world',
      translation: 'Ciao mondo'
    };

    expect(() => deleteTranslationSchema.parse(invalidInput)).toThrow();
  });
});

describe('deleteTranslation', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.memories.deleteTranslation with required parameters', async () => {
    const mockResult = { success: true };
    mockTranslator.memories.deleteTranslation = vi.fn().mockResolvedValue(mockResult);

    const args = {
      id: ['mem_xyz123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello world',
      translation: 'Ciao mondo'
    };

    const result = await deleteTranslation(args, mockTranslator as any as Translator);

    expect(mockTranslator.memories.deleteTranslation).toHaveBeenCalledWith(
      args.id,
      args.source,
      args.target,
      args.sentence,
      args.translation
    );
    expect(result).toEqual(mockResult);
  });

  it('should include tuid when provided', async () => {
    const mockResult = { success: true };
    mockTranslator.memories.deleteTranslation = vi.fn().mockResolvedValue(mockResult);

    const args = {
      id: ['mem_xyz123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello world',
      translation: 'Ciao mondo',
      tuid: 'translation-123',
      sentence_before: 'How are you?',
      sentence_after: 'How is the weather?'
    };

    const result = await deleteTranslation(args, mockTranslator as any as Translator);

    expect(mockTranslator.memories.deleteTranslation).toHaveBeenCalledWith(
      args.id,
      args.source,
      args.target,
      args.sentence,
      args.translation,
      args.tuid,
      args.sentence_before,
      args.sentence_after
    );
    expect(result).toEqual(mockResult);
  });

  it('should throw error if only one of sentence_before or sentence_after is provided', async () => {
    const args = {
      id: ['mem_xyz123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello world',
      translation: 'Ciao mondo',
      tuid: 'translation-123',
      sentence_before: 'How are you?'
      // Missing sentence_after
    };

    await expect(deleteTranslation(args, mockTranslator as any as Translator)).rejects.toThrow(
      'Please provide both sentence_before and sentence_after'
    );
  });
}); 