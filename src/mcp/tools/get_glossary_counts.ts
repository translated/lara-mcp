import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossaryIdSchema, glossaryCountsSchema } from "./_schemas.js";

export const getGlossaryCountsOutputSchema = glossaryCountsSchema;

export const getGlossaryCountsSchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
});

export async function getGlossaryCounts(args: unknown, lara: Translator) {
  const { id } = getGlossaryCountsSchema.parse(args);

  return await lara.glossaries.counts(id);
}
