import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const exportGlossarySchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  content_type: z
    .enum(["csv/table-uni", "csv/table-multi"])
    .describe("The export format. 'csv/table-uni' for unidirectional (requires source parameter), 'csv/table-multi' for multidirectional"),
  source: z
    .string()
    .optional()
    .describe("The source language code. Required when content_type is 'csv/table-uni'"),
});

export async function exportGlossary(args: any, lara: Translator) {
  const validatedArgs = exportGlossarySchema.parse(args);
  const { id, content_type, source } = validatedArgs;

  return await lara.glossaries.export(id, content_type, source);
}
