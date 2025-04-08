import { Translator } from "@translated/lara";
import { z } from "zod";

export const createMemorySchema = z.object({
  name: z
    .string()
    .describe(
      "Custom name of the memory, it can be any string including spaces and special characters and non-latin alphabets. Max length: 250 characters."
    )
    .refine((name) => name.length <= 250, {
      message: "Name can't be more than 250 characters",
    }),
  external_id: z
    .string()
    .describe(
      "The ID of the memory to be imported from MyMemory. Use this to initialize the memory with external content. Format: ext_my_[MyMemory ID]"
    )
    .optional(),
});

export async function createMemory(args: any, lara: Translator) {
  const validatedArgs = createMemorySchema.parse(args);
  const { name, external_id } = validatedArgs;
  if (external_id) {
    return await lara.memories.create(name, external_id);
  }
  return await lara.memories.create(name);
}
