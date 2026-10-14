import { vi, type Mock } from 'vitest';
import { Translator } from '@translated/lara';

/**
 * The mock return type for our translator's methods
 */
export type MockTranslator = ReturnType<typeof createMockTranslator>;

/**
 * Creates a mock Translator instance with all required methods mocked
 */
// Explicit Mock return type keeps the exported type nameable for declaration emit
const mock = (): Mock => vi.fn();

export function createMockTranslator() {
  return {
    detect: mock(),
    translate: mock(),
    getLanguages: mock(),
    createMemory: mock(),
    updateMemory: mock(),
    deleteMemory: mock(),
    getMemories: mock(),
    addTranslation: mock(),
    deleteTranslation: mock(),
    importTmx: mock(),
    getImportStatus: mock(),
    memories: {
      create: mock(),
      update: mock(),
      delete: mock(),
      get: mock(),
      list: mock(),
      addTranslation: mock(),
      deleteTranslation: mock(),
      importTmx: mock(),
      getImportStatus: mock(),
    },
    glossaries: {
      list: mock(),
      get: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      importCsv: mock(),
      getImportStatus: mock(),
      export: mock(),
      counts: mock(),
      addOrReplaceEntry: mock(),
      deleteEntry: mock(),
    },
    client: {
      setExtraHeader: mock(),
    }
  };
}

/**
 * Setups up the translator mock for tests
 */
export function setupTranslatorMock() {
  vi.mock('@translated/lara', () => {
    return {
      Translator: vi.fn(function () { return createMockTranslator(); })
    };
  });
}

/**
 * Creates a mock translator instance for tests
 * Use this in tests after setupTranslatorMock() has been called
 * 
 * @returns A mocked instance that can be used with 'as any as Translator' in tests 
 */
export function getMockTranslator(): MockTranslator {
  return new (Translator as any)();
} 