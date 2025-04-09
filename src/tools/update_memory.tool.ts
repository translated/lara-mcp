import { Translator } from "@translated/lara";
import { z } from "zod";

export const updateMemorySchema = z.object({
  id: z
    .string()
    .describe(
      "The unique identifier of the memory to update. Format: mem_xyz123"
    ),
  name: z
    .string()
    .describe("The new name for the memory")
    .refine((name) => name.length <= 250, {
      message: "Name can't be more than 250 characters",
    }),
});

export async function updateMemory(args: any, lara: Translator) {
  const validatedArgs = updateMemorySchema.parse(args);
  const { id, name } = validatedArgs;
  return await lara.memories.update(id, name);
}
