import { z } from "zod/v4";

const isoDate = z
  .string()
  .describe("ISO 8601 timestamp");

export const textBlockSchema = z
  .object({
    text: z.string().describe("Text content of the block"),
    translatable: z
      .boolean()
      .optional()
      .describe(
        "Whether the block should be translated. Omitted on response blocks the engine treats as wholly translatable."
      ),
  })
  .loose();

export const memorySchema = z
  .object({
    id: z.string().describe("Unique memory identifier (format: mem_*)"),
    createdAt: isoDate,
    updatedAt: isoDate,
    sharedAt: isoDate,
    name: z.string().describe("Display name of the memory"),
    externalId: z
      .string()
      .optional()
      .describe("External identifier (e.g. MyMemory ID) when imported"),
    secret: z.string().optional().describe("Memory secret, if any"),
    ownerId: z.string().describe("Identifier of the memory owner"),
    collaboratorsCount: z
      .number()
      .int()
      .describe("Number of collaborators with access to the memory"),
    isPersonal: z
      .boolean()
      .describe("True if the memory is private to the owner"),
  })
  .loose();

export const memoryImportSchema = z
  .object({
    id: z.string().describe("Import job identifier"),
    begin: z.number().optional().describe("Begin offset of the import"),
    end: z.number().optional().describe("End offset of the import"),
    channel: z
      .number()
      .optional()
      .describe("Channel identifier used by the import"),
    size: z
      .number()
      .optional()
      .describe("Total number of units in the import"),
    progress: z
      .number()
      .optional()
      .describe("Import progress between 0 and 1 (1 means complete)"),
  })
  .loose();

export const glossarySchema = z
  .object({
    id: z.string().describe("Unique glossary identifier (format: gls_*)"),
    name: z.string().describe("Display name of the glossary"),
    ownerId: z.string().describe("Identifier of the glossary owner"),
    createdAt: isoDate,
    updatedAt: isoDate,
    isPersonal: z
      .boolean()
      .describe("True if the glossary is private to the owner"),
  })
  .loose();

export const glossaryImportSchema = z
  .object({
    id: z.string().describe("Import job identifier"),
    begin: z.number().optional().describe("Begin offset of the import"),
    end: z.number().optional().describe("End offset of the import"),
    channel: z
      .number()
      .optional()
      .describe("Channel identifier used by the import"),
    size: z
      .number()
      .optional()
      .describe("Total number of entries in the import"),
    progress: z
      .number()
      .optional()
      .describe("Import progress between 0 and 1 (1 means complete)"),
  })
  .loose();

export const glossaryCountsSchema = z
  .object({
    unidirectional: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        "Entry counts keyed by language code for unidirectional glossaries"
      ),
    multidirectional: z
      .number()
      .optional()
      .describe("Total entry count for multidirectional glossaries"),
  })
  .loose();

export const detectResultSchema = z
  .object({
    language: z
      .string()
      .describe("Detected language code (e.g., 'en-US')"),
    contentType: z
      .string()
      .describe("Content type of the analysed text"),
    predictions: z
      .array(
        z
          .object({
            language: z.string().describe("Candidate language code"),
            confidence: z
              .number()
              .describe("Confidence score between 0 and 1"),
          })
          .loose()
      )
      .describe("Ranked list of candidate languages with confidence scores"),
  })
  .loose();
