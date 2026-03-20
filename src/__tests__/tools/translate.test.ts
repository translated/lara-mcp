import { describe, it, expect, beforeEach } from 'vitest';
import { translateHandler, translateSchema } from '../../mcp/tools/translate.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';

// Setup mocks
setupTranslatorMock();

describe('translateSchema', () => {
  it('should validate valid input', () => {
    const validInput = {
      text: [{ text: 'Hello world', translatable: true }],
      target: 'it-IT'
    };

    expect(() => translateSchema.parse(validInput)).not.toThrow();
  });

  it('should reject invalid input', () => {
    const invalidInput = {
      text: 'not an array',
      target: 'it-IT'
    };

    expect(() => translateSchema.parse(invalidInput)).toThrow();
  });

  it('should require target language', () => {
    const missingTarget = {
      text: [{ text: 'Hello world', translatable: true }]
    };

    expect(() => translateSchema.parse(missingTarget)).toThrow();
  });

  it('should validate glossaries parameter', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      glossaries: ['gls_xyz123', 'gls_abc456']
    })).not.toThrow();
  });

  it('should validate no_trace parameter', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      no_trace: true
    })).not.toThrow();
  });

  it('should validate priority parameter', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      priority: 'background'
    })).not.toThrow();
  });

  it('should validate timeout_in_millis parameter', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      timeout_in_millis: 30000
    })).not.toThrow();
  });

  it('should reject invalid priority value', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      priority: 'invalid'
    })).toThrow();
  });

  it('should reject negative timeout', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      timeout_in_millis: -1000
    })).toThrow();
  });

  it('should reject Infinity timeout', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      timeout_in_millis: Infinity
    })).toThrow();
  });

  it('should reject timeout over max limit', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      timeout_in_millis: 999999999
    })).toThrow();
  });

  it('should reject float timeout values', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      timeout_in_millis: 1000.5
    })).toThrow();
  });

  it('should reject too many glossaries', () => {
    const tooMany = Array(100).fill('gls_abc123');
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      glossaries: tooMany
    })).toThrow();
  });

  it('should reject invalid glossary ID format', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      glossaries: ['invalid-id']
    })).toThrow();
  });

  it('should accept valid style values', () => {
    for (const style of ['faithful', 'fluid', 'creative']) {
      expect(() => translateSchema.parse({
        text: [{ text: 'hello', translatable: true }],
        target: 'it-IT',
        style
      })).not.toThrow();
    }
  });

  it('should reject invalid style value', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      style: 'invalid'
    })).toThrow();
  });

  it('should accept reasoning boolean', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      reasoning: true
    })).not.toThrow();
  });

  it('should reject non-boolean reasoning', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      reasoning: 'yes'
    })).toThrow();
  });

  it('should accept valid content_type values', () => {
    for (const content_type of ['text/plain', 'text/html', 'application/xliff+xml']) {
      expect(() => translateSchema.parse({
        text: [{ text: 'hello', translatable: true }],
        target: 'it-IT',
        content_type
      })).not.toThrow();
    }
  });

  it('should reject invalid content_type value', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      content_type: 'application/json'
    })).toThrow();
  });
});

describe('translateHandler', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = getMockTranslator();
  });

  it('should call lara.translate with correct parameters', async () => {
    const mockTranslationResult = {
      translation: [{ text: 'Ciao mondo', translatable: true }]
    };
    mockTranslator.translate.mockResolvedValue(mockTranslationResult);

    const args = {
      text: [{ text: 'Hello world', translatable: true }],
      target: 'it-IT'
    };

    const result = await translateHandler(args, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      args.text,
      null,
      args.target,
      {}
    );
    expect(result).toEqual(mockTranslationResult.translation);
  });

  it('should handle context and instructions', async () => {
    const mockTranslationResult = {
      translation: [{ text: 'Ciao mondo', translatable: true }]
    };
    mockTranslator.translate.mockResolvedValue(mockTranslationResult);

    const args = {
      text: [{ text: 'Hello world', translatable: true }],
      target: 'it-IT',
      context: 'Casual conversation',
      instructions: ['Use informal tone']
    };

    await translateHandler(args, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      args.text,
      null,
      args.target,
      {
        instructions: [
          'Use informal tone',
          'Always consider the following contextual information: Casual conversation'
        ],
        adaptTo: undefined
      }
    );
  });

  it('should pass glossaries option to SDK', async () => {
    const mockTranslation = {
      translation: [{ text: 'ciao', translatable: true }],
      sourceLanguage: 'en-EN',
      contentType: 'text/plain'
    };
    mockTranslator.translate.mockResolvedValue(mockTranslation);

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      glossaries: ['gls_xyz123']
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        glossaries: ['gls_xyz123']
      })
    );
  });

  it('should pass noTrace option to SDK', async () => {
    const mockTranslation = {
      translation: [{ text: 'ciao', translatable: true }],
      sourceLanguage: 'en-EN',
      contentType: 'text/plain'
    };
    mockTranslator.translate.mockResolvedValue(mockTranslation);

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      no_trace: true
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        noTrace: true
      })
    );
  });

  it('should pass priority and timeout options to SDK', async () => {
    const mockTranslation = {
      translation: [{ text: 'ciao', translatable: true }],
      sourceLanguage: 'en-EN',
      contentType: 'text/plain'
    };
    mockTranslator.translate.mockResolvedValue(mockTranslation);

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      priority: 'background',
      timeout_in_millis: 60000
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        priority: 'background',
        timeoutInMillis: 60000
      })
    );
  });

  it('should pass style option to SDK', async () => {
    mockTranslator.translate.mockResolvedValue({
      translation: [{ text: 'ciao', translatable: true }]
    });

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      style: 'creative'
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        style: 'creative'
      })
    );
  });

  it('should pass reasoning option to SDK', async () => {
    mockTranslator.translate.mockResolvedValue({
      translation: [{ text: 'ciao', translatable: true }]
    });

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      reasoning: true
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        reasoning: true
      })
    );
  });

  it('should pass content_type as contentType to SDK', async () => {
    mockTranslator.translate.mockResolvedValue({
      translation: [{ text: 'ciao', translatable: true }]
    });

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      content_type: 'text/html'
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        contentType: 'text/html'
      })
    );
  });

  it('should pass style, reasoning, and content_type together', async () => {
    mockTranslator.translate.mockResolvedValue({
      translation: [{ text: 'ciao', translatable: true }]
    });

    await translateHandler({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      style: 'fluid',
      reasoning: true,
      content_type: 'application/xliff+xml'
    }, mockTranslator as any as Translator);

    expect(mockTranslator.translate).toHaveBeenCalledWith(
      expect.anything(),
      null,
      'it-IT',
      expect.objectContaining({
        style: 'fluid',
        reasoning: true,
        contentType: 'application/xliff+xml'
      })
    );
  });
}); 