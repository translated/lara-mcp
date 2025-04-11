import { z } from "zod";
import { Translator } from "@translated/lara";

export const listMemoriesSchema = z.object({})

export async function listMemories(lara: Translator) {
    return await lara.memories.list()
}