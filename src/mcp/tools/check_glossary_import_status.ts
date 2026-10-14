import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { glossaryImportSchema } from "./_schemas.js";

export const checkGlossaryImportStatusOutputSchema = glossaryImportSchema;

export const checkGlossaryImportStatusSchema = z.object({
  id: z.string().describe("The ID of the glossary import job"),
});

export async function checkGlossaryImportStatus(args: unknown, lara: Translator) {
  const { id } = checkGlossaryImportStatusSchema.parse(args);

  return await lara.glossaries.getImportStatus(id);
}
