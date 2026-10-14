import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossaryIdSchema, glossarySchema } from "./_schemas.js";

export const deleteGlossaryOutputSchema = glossarySchema;

export const deleteGlossarySchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID to delete (format: gls_*, e.g., 'gls_xyz123')"),
});

export async function deleteGlossary(args: unknown, lara: Translator) {
  const { id } = deleteGlossarySchema.parse(args);
  return await lara.glossaries.delete(id);
}
