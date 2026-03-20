import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const getGlossaryCountsSchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
});

export async function getGlossaryCounts(args: any, lara: Translator) {
  const validatedArgs = getGlossaryCountsSchema.parse(args);
  const { id } = validatedArgs;

  return await lara.glossaries.counts(id);
}
