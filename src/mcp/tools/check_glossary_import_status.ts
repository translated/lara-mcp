import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const checkGlossaryImportStatusSchema = z.object({
  id: z.string().describe("The ID of the glossary import job"),
});

export async function checkGlossaryImportStatus(args: any, lara: Translator) {
  const validatedArgs = checkGlossaryImportStatusSchema.parse(args);
  const { id } = validatedArgs;

  return await lara.glossaries.getImportStatus(id);
}
