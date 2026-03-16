import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const createGlossarySchema = z.object({
  name: z
    .string()
    .describe(
      "The name of the new glossary, it should be short and descriptive, like 'brand_terms' or 'legal_terminology'"
    )
    .refine((name) => name.length <= 250, {
      message: "Name of the glossary can't be more than 250 characters",
    }),
});

export async function createGlossary(args: any, lara: Translator) {
  const validatedArgs = createGlossarySchema.parse(args);
  const { name } = validatedArgs;
  return await lara.glossaries.create(name);
}
