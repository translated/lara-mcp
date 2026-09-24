import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossarySchema } from "./_schemas.js";

export const createGlossaryOutputSchema = glossarySchema;

export const createGlossarySchema = z.object({
  name: z
    .string()
    .describe(
      "The name of the new glossary, it should be short and descriptive, like 'brand_terms' or 'legal_terminology'"
    )
    .max(250, "Name of the glossary can't be more than 250 characters"),
});

export async function createGlossary(args: unknown, lara: Translator) {
  const { name } = createGlossarySchema.parse(args);
  return await lara.glossaries.create(name);
}
