import { z } from "zod/v4";
import { Translator } from "@translated/lara";

export const listGlossariesSchema = z.object({});

export async function listGlossaries(lara: Translator) {
    return await lara.glossaries.list();
}
