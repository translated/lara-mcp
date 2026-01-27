import { z } from "zod/v4";
import { Translator } from "@translated/lara";

export const getGlossarySchema = z.object({
  id: z.string()
    .describe("The glossary ID (e.g., 'gls_xyz123')"),
});

export async function getGlossary(args: unknown, lara: Translator) {
  const validatedArgs = getGlossarySchema.parse(args);
  const { id } = validatedArgs;

  return await lara.glossaries.get(id);
}
