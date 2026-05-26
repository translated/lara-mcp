import { z } from "zod/v4";
import { Translator } from "@translated/lara";
import { memorySchema } from "./_schemas.js";

export const listMemoriesSchema = z.object({})

export const listMemoriesOutputSchema = z.object({
  items: z
    .array(memorySchema)
    .describe("Translation memories accessible to the authenticated account"),
});

export async function listMemories(lara: Translator) {
    return await lara.memories.list()
}