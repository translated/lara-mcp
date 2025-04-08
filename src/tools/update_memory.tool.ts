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
    .describe(
      "Custom name of the memory, it can be any string including spaces and special characters and non-latin alphabets. Max length: 250 characters."
    )
    .refine((name) => name.length <= 250, {
      message: "Name can't be more than 250 characters",
    }),
});

export async function updateMemory(args: any, lara: Translator) {
  const validatedArgs = updateMemorySchema.parse(args);
  const { id, name } = validatedArgs;
  return await lara.memories.update(id, name);
}
