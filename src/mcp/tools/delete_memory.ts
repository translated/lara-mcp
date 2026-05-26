import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { memorySchema } from "./_schemas.js";

export const deleteMemoryOutputSchema = memorySchema;

export const deleteMemorySchema = z.object({
  id: z
    .string()
    .describe(
      "The unique identifier of the memory to update. Format: mem_xyz123"
    ),
});

export async function deleteMemory(args: any, lara: Translator) {
  const validatedArgs = deleteMemorySchema.parse(args);
  const { id } = validatedArgs;
  return await lara.memories.delete(id);
}
