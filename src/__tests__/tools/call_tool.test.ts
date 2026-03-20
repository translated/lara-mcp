import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallTool } from '../../mcp/tools.js';
import { createMockTranslator, type MockTranslator } from '../utils/mocks.js';
import { Translator } from '@translated/lara';
import { InvalidInputError } from '../../exception.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

const actualLara = await vi.importActual<typeof import('@translated/lara')>('@translated/lara');
const { LaraApiError, TimeoutError: LaraTimeoutError } = actualLara;

vi.mock('@translated/lara', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@translated/lara')>();
  return {
    ...actual,
    Translator: vi.fn(() => createMockTranslator()),
  };
});

function makeRequest(name: string, args: Record<string, unknown> = {}): CallToolRequest {
  return {
    method: 'tools/call',
    params: { name, arguments: args },
  } as CallToolRequest;
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
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow('Memory not found');
  });

  it('should surface timeout error message', async () => {
    const timeoutError = new LaraTimeoutError('Request timed out');
    mockTranslator.memories.delete.mockRejectedValue(timeoutError);

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow(
      'The translation request timed out. Try again or increase the timeout.'
    );
  });

  it('should include field names and reasons in Zod validation errors', async () => {
    const request = makeRequest('delete_memory', { id: 123 });
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow(/Invalid input:.*id/);
  });

  it('should use "arguments" label for root-level Zod errors', async () => {
    // Passing a non-object triggers a root-level Zod error with empty path
    const request = makeRequest('delete_memory', 'not-an-object' as any);
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow(/Invalid input: arguments:/);
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
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow('Custom validation error from handler');
  });

  it('should return generic message for unknown errors', async () => {
    mockTranslator.memories.delete.mockRejectedValue(new TypeError('Something unexpected'));

    const request = makeRequest('delete_memory', { id: 'mem_abc123' });
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow('An error occurred while processing your request');
  });

  it('should throw InvalidInputError for unknown tool names', async () => {
    const request = makeRequest('nonexistent_tool', {});
    const promise = CallTool(request, mockTranslator as any as Translator);

    await expect(promise).rejects.toThrow(InvalidInputError);
    await expect(promise).rejects.toThrow('Tool nonexistent_tool not found');
  });
});
