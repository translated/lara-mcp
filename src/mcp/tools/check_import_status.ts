import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { memoryImportSchema } from "./_schemas.js";

export const checkImportStatusOutputSchema = memoryImportSchema;

export const checkImportStatusSchema = z.object({
  id: z.string().describe("The ID of the import job"),
});

export async function checkImportStatus(args: unknown, lara: Translator) {
  const { id } = checkImportStatusSchema.parse(args);

  return await lara.memories.getImportStatus(id);
}