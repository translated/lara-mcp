import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const updateGlossarySchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  name: z
    .string()
    .describe("The new name for the glossary")
    .refine((name) => name.length <= 250, {
      message: "Name can't be more than 250 characters",
    }),
});

export async function updateGlossary(args: any, lara: Translator) {
  const validatedArgs = updateGlossarySchema.parse(args);
  const { id, name } = validatedArgs;
  return await lara.glossaries.update(id, name);
}
