import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallTool } from '../../mcp/tools.js';
import { createMockTranslator, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import { InvalidInputError } from '../../exception.js';
import { ProtocolError, ProtocolErrorCode, type CallToolRequest, type CallToolResult } from '@modelcontextprotocol/server';

const actualLara = await vi.importActual<typeof import('@translated/lara')>('@translated/lara');
const { LaraApiError, TimeoutError: LaraTimeoutError } = actualLara;

vi.mock('@translated/lara', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@translated/lara')>();
  return {
    ...actual,
    Translator: vi.fn(function () { return createMockTranslator(); }),
  };
});

function makeRequest(name: string, args: Record<string, unknown> = {}): CallToolRequest {
  return {
    method: 'tools/call',
    params: { name, arguments: args },
  } as CallToolRequest;
}

function expectToolError(result: CallToolResult, message: string | RegExp) {
  expect(result).toEqual({
    isError: true,
    content: [{ type: 'text', text: typeof message === 'string' ? message : expect.stringMatching(message) }],
  });
}

describe('CallTool error handling', () => {
  let mockTranslator: MockTranslator;

  beforeEach(() => {
    mockTranslator = new (Translator as any)();
  });

  it('should surface LaraApiError message', async () => {
    const apiError = new LaraApiError(404, 'not_found', 'Memory not found');
    mockTranslator.memories.delete.mockRejectedValue(apiError);

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, 'Memory not found');
  });

  it('should surface timeout error message', async () => {
    const timeoutError = new LaraTimeoutError('Request timed out');
    mockTranslator.memories.delete.mockRejectedValue(timeoutError);

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, 'The translation request timed out. Try again or increase the timeout.');
  });

  it('should include field names and reasons in Zod validation errors', async () => {
    const request = makeRequest('delete_memory', { id: 123 });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, /Invalid input:.*id/);
  });

  it('should use "arguments" label for root-level Zod errors', async () => {
    // Passing a non-object triggers a root-level Zod error with empty path
    const request = makeRequest('delete_memory', 'not-an-object' as any);
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, /Invalid input: arguments:/);
  });

  it('should preserve InvalidInputError as-is', async () => {
    mockTranslator.memories.addTranslation.mockImplementation(() => {
      throw new InvalidInputError('Custom validation error from handler');
    });

    const request = makeRequest('add_translation', {
      id: ['mem_abc123'],
      source: 'en-US',
      target: 'it-IT',
      sentence: 'Hello',
      translation: 'Ciao',
      tuid: 'tu_1',
      sentence_before: 'Hi',
      sentence_after: 'Goodbye',
    });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, 'Custom validation error from handler');
  });

  it('should return structuredContent and narration for handler tools', async () => {
    mockTranslator.translate.mockResolvedValue({
      translation: 'Ciao',
      sourceLanguage: 'en-US',
    });

    const request = makeRequest('translate', {
      text: [{ text: 'Hello', translatable: true }],
      target: 'it-IT',
    });

    const result = await CallTool(request, mockTranslator as any as Translator);

    expect(result).toHaveProperty('structuredContent');
    expect(result.structuredContent).toEqual({ value: 'Ciao' });
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content![0]).toHaveProperty('type', 'text');
    expect((result.content![0] as any).text).toContain('it-IT');
  });

  it('should wrap array results under items in structuredContent for lister tools', async () => {
    mockTranslator.memories.list.mockResolvedValue([
      { id: 'mem_1', name: 'First' },
      { id: 'mem_2', name: 'Second' },
    ]);

    const request = makeRequest('list_memories', {});

    const result = await CallTool(request, mockTranslator as any as Translator);

    expect(result.structuredContent).toEqual({
      items: [
        { id: 'mem_1', name: 'First' },
        { id: 'mem_2', name: 'Second' },
      ],
    });
    expect((result.content![0] as any).text).toContain('2');
  });

  it('should return generic message for unknown errors', async () => {
    mockTranslator.memories.delete.mockRejectedValue(new TypeError('Something unexpected'));

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expectToolError(result, 'An error occurred while processing your request');
  });

  it('should not leak unexpected error details or call the SDK twice', async () => {
    mockTranslator.memories.delete.mockRejectedValue(new Error('db password=hunter2'));

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const result = await CallTool(request, mockTranslator as any as Translator);

    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(mockTranslator.memories.delete).toHaveBeenCalledTimes(1);
  });

  it('should throw a -32602 ProtocolError for unknown tool names', async () => {
    const request = makeRequest('nonexistent_tool', {});
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(ProtocolError);
    await expect(promise).rejects.toMatchObject({
      code: ProtocolErrorCode.InvalidParams,
      message: expect.stringContaining('Tool nonexistent_tool not found'),
    });
  });

  it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty'])(
    'should treat inherited property name %s as an unknown tool',
    async (name) => {
      const promise = CallTool(makeRequest(name, {}), mockTranslator as any as Translator);

      await expect(promise).rejects.toMatchObject({ code: ProtocolErrorCode.InvalidParams });
    }
  );
});
