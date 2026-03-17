import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const checkDocumentStatusSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("The document ID to check status for."),
});

export async function checkDocumentStatus(args: unknown, lara: Translator) {
  const validatedArgs = checkDocumentStatusSchema.parse(args);
  return await lara.documents.status(validatedArgs.id);
}
