import { z } from "zod/v4";
import { Translator } from "@translated/lara";
import { glossaryIdSchema, glossarySchema } from "./_schemas.js";

export const getGlossaryOutputSchema = z.object({
  glossary: glossarySchema
    .nullable()
    .describe("The requested glossary, or null when no glossary has that id"),
});

export const getGlossarySchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
});

export async function getGlossary(args: unknown, lara: Translator) {
  const { id } = getGlossarySchema.parse(args);

  const glossary = await lara.glossaries.get(id);
  return { glossary: glossary ?? null };
}
