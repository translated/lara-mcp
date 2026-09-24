import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { InvalidInputError } from "#exception";
import { glossaryIdSchema, glossaryImportSchema } from "./_schemas.js";

export const deleteGlossaryEntryOutputSchema = glossaryImportSchema;

export const deleteGlossaryEntrySchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  term: z.object({
    language: z.string().describe("The language code of the term"),
    value: z.string().describe("The term value"),
  }).optional().describe("The term to delete. Use this for monodirectional glossaries."),
  guid: z.string().optional().describe(
    "The entry GUID to delete. Use this for multidirectional glossaries."
  ),
});

export async function deleteGlossaryEntry(args: unknown, lara: Translator) {
  const { id, term, guid } = deleteGlossaryEntrySchema.parse(args);

  if (!term && !guid) {
    throw new InvalidInputError("At least one of 'term' or 'guid' must be provided");
  }

  return await lara.glossaries.deleteEntry(id, term, guid);
}
