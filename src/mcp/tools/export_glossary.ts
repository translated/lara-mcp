import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossaryFileFormatSchema, glossaryIdSchema } from "./_schemas.js";

export const exportGlossaryOutputSchema = z.object({
  value: z
    .string()
    .describe("The exported glossary content serialised as CSV"),
});

export const exportGlossarySchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  content_type: glossaryFileFormatSchema
    .describe("The export format. 'csv/table-uni' for unidirectional (requires source parameter), 'csv/table-multi' for multidirectional"),
  source: z
    .string()
    .optional()
    .describe("The source language code. Required when content_type is 'csv/table-uni'"),
});

export async function exportGlossary(args: unknown, lara: Translator) {
  const { id, content_type, source } = exportGlossarySchema.parse(args);

  return await lara.glossaries.export(id, content_type, source);
}
