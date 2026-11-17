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
    .describe(
      "The export format. It must match the glossary: get_glossary_counts returns 'unidirectional' " +
      "(use 'csv/table-uni', requires source) or 'multidirectional' (use 'csv/table-multi')."
    ),
  source: z
    .string()
    .optional()
    .describe("The source language to export. Required with 'csv/table-uni': one of the language keys get_glossary_counts returns."),
}).refine((args) => args.content_type !== "csv/table-uni" || args.source, {
  // Lara 400s it otherwise.
  path: ["source"], message: "source is required when content_type is csv/table-uni: use a language key from get_glossary_counts",
});

export async function exportGlossary(args: unknown, lara: Translator) {
  const { id, content_type, source } = exportGlossarySchema.parse(args);

  return await lara.glossaries.export(id, content_type, source);
}
