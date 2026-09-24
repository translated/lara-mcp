import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossaryIdSchema, glossarySchema } from "./_schemas.js";

export const updateGlossaryOutputSchema = glossarySchema;

export const updateGlossarySchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  name: z
    .string()
    .describe("The new name for the glossary")
    .max(250, "Name can't be more than 250 characters"),
});

export async function updateGlossary(args: unknown, lara: Translator) {
  const { id, name } = updateGlossarySchema.parse(args);
  return await lara.glossaries.update(id, name);
}
