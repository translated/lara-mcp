import { Translator } from "@translated/lara";
import { z } from "zod";

export const checkImportStatusSchema = z.object({
  id: z.string().describe("The ID of the import job"),
});

export async function checkImportStatus(args: any, lara: Translator) {
  const validatedArgs = checkImportStatusSchema.parse(args);
  const { id } = validatedArgs;

  return await lara.memories.getImportStatus(id);
}
