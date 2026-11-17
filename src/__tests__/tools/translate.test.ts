import { describe, it, expect, beforeEach } from 'vitest';
import { MAX_INSTRUCTIONS, translateHandler, translateSchema } from '../../mcp/tools/translate.js';
import { getMockTranslator, setupTranslatorMock, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import { ListTools } from '../../mcp/tools.js';

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
    expect(() => translateSchema.parse({ text: 42, target: 'it-IT' })).toThrow();
  });

  it('should read a bare string as one translatable block', () => {
    expect(translateSchema.parse({ text: 'Hello', target: 'it-IT' }).text).toEqual([{ text: 'Hello' }]);
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

  it('should accept instructions with fewer than 20 words each', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      instructions: ['Translate formally', 'Use a creative and concise tone']
    })).not.toThrow();
  });

  it('should accept an instruction with exactly 20 words', () => {
    const twentyWords = Array(20).fill('word').join(' ');
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      instructions: [twentyWords]
    })).not.toThrow();
  });

  it('should accept an instruction longer than 20 words', () => {
    const thirtyWords = Array(30).fill('word').join(' ');
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      instructions: ['Translate formally', thirtyWords]
    })).not.toThrow();
  });

  it('should reject an empty text array', () => {
    expect(() => translateSchema.parse({ text: [], target: 'it-IT' })).toThrow();
  });

  it('should accept 128 text blocks and reject 129', () => {
    const blocks = (n: number) => Array.from({ length: n }, () => ({ text: 'hello' }));
    expect(() => translateSchema.parse({ text: blocks(128), target: 'it-IT' })).not.toThrow();
    expect(() => translateSchema.parse({ text: blocks(129), target: 'it-IT' })).toThrow();
  });

  it('should read bare strings as text blocks', () => {
    expect(translateSchema.parse({ text: ['a', 'b'], target: 'it-IT' }).text).toEqual([
      { text: 'a' },
      { text: 'b' }
    ]);
  });

  it('should advertise the block limits and object items in the published input schema', async () => {
    const { tools } = await ListTools();
    const text = (tools.find((tool) => tool.name === 'translate')!.inputSchema.properties as any).text;
    expect(text.minItems).toBe(1);
    expect(text.maxItems).toBe(128);
    expect(text.items.type).toBe('object');
  });

  it('should accept an empty instructions array', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      instructions: []
    })).not.toThrow();
  });

  it('should handle instructions with extra whitespace correctly', () => {
    expect(() => translateSchema.parse({
      text: [{ text: 'hello', translatable: true }],
      target: 'it-IT',
      instructions: ['  Translate   formally  ']
    })).not.toThrow();
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
      {},
      undefined
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
      },
      undefined
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
      }),
      undefined
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
      }),
      undefined
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
      }),
      undefined
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
      }),
      undefined
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
      }),
      undefined
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
      }),
      undefined
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
      }),
      undefined
    );
  });

  const translated = (texts: string[]) => ({ translation: texts.map((text) => ({ text, translatable: true })) });
  const optionsSent = () => mockTranslator.translate.mock.calls[0][3];

  it('should send source_hint only as a language code and only without source', async () => {
    mockTranslator.translate.mockResolvedValue(translated(['ciao']));
    const text = [{ text: 'hello' }];

    await translateHandler({ text, target: 'it-IT', source_hint: 'en' }, mockTranslator as any as Translator);
    await translateHandler({ text, target: 'it-IT', source_hint: 'English' }, mockTranslator as any as Translator);
    await translateHandler({ text, source: 'en-US', target: 'it-IT', source_hint: 'en' }, mockTranslator as any as Translator);

    expect(mockTranslator.translate.mock.calls.map((c: any[]) => c[3].sourceHint)).toEqual(['en', undefined, undefined]);
  });

  it('should join instructions past the limit into the last one, context included', async () => {
    mockTranslator.translate.mockResolvedValue(translated(['ciao']));
    const instructions = Array.from({ length: 11 }, (_, i) => `i${i}`);

    await translateHandler({ text: ['hello'], target: 'it-IT', instructions, context: 'ctx' }, mockTranslator as any as Translator);

    const sent = optionsSent().instructions;
    expect(sent).toHaveLength(MAX_INSTRUCTIONS);
    expect(sent.slice(0, 9)).toEqual(instructions.slice(0, 9));
    expect(sent[9]).toBe('i9 i10 Always consider the following contextual information: ctx');
  });

  it('should not send empty blocks to Lara and put them back in place', async () => {
    mockTranslator.translate.mockResolvedValue(translated(['uno', 'due']));

    const result = await translateHandler(
      { text: [{ text: 'one' }, { text: '' }, { text: 'two' }], target: 'it-IT' },
      mockTranslator as any as Translator
    );

    expect(mockTranslator.translate.mock.calls[0][0]).toEqual([{ text: 'one' }, { text: 'two' }]);
    expect(result).toEqual([{ text: 'uno', translatable: true }, { text: '' }, { text: 'due', translatable: true }]);
  });

  it('should return the input without calling Lara when nothing is translatable', async () => {
    const text = [{ text: '' }, { text: '<b>', translatable: false }];

    expect(await translateHandler({ text, target: 'it-IT' }, mockTranslator as any as Translator)).toEqual(text);
    expect(mockTranslator.translate).not.toHaveBeenCalled();
  });
});
