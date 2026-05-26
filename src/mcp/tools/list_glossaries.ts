import { z } from "zod/v4";
import { Translator } from "@translated/lara";
import { glossarySchema } from "./_schemas.js";

export const listGlossariesSchema = z.object({});

export const listGlossariesOutputSchema = z.object({
  items: z
    .array(glossarySchema)
    .describe("Glossaries accessible to the authenticated account"),
});

export async function listGlossaries(lara: Translator) {
    return await lara.glossaries.list();
}
