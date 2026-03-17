import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const addGlossaryEntrySchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  terms: z.array(z.object({
    language: z.string().describe("The language code of the term. Use the list_languages tool to get supported languages."),
    value: z.string().describe("The term value in the specified language"),
  })).min(1).describe(
    "Array of terms with language and value. For monodirectional glossaries, the first term is the source and the rest are targets. For multidirectional glossaries, all terms are treated equally. Use the list_languages tool to get supported language codes."
  ),
  guid: z.string().optional().describe(
    "Optional entry identifier. Use this for multidirectional glossaries or to update a specific entry."
  ),
});

export async function addGlossaryEntry(args: unknown, lara: Translator) {
  const { id, terms, guid } = addGlossaryEntrySchema.parse(args);

  if (guid !== undefined) {
    return await lara.glossaries.addOrReplaceEntry(id, terms, guid);
  }

  return await lara.glossaries.addOrReplaceEntry(id, terms);
}
