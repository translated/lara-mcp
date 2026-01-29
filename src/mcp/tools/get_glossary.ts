import { z } from "zod/v4";
import { Translator } from "@translated/lara";

export const getGlossarySchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
});

export async function getGlossary(args: unknown, lara: Translator) {
  const validatedArgs = getGlossarySchema.parse(args);
  const { id } = validatedArgs;

  return await lara.glossaries.get(id);
}
