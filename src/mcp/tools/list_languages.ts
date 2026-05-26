import { z } from "zod/v4";
import { Translator } from "@translated/lara";

export const listLanguagesSchema = z.object({});

export const listLanguagesOutputSchema = z.object({
  items: z
    .array(z.string())
    .describe("Supported language codes (e.g., 'en-US', 'it-IT')"),
});

export async function listLanguages(lara: Translator) {
  return await lara.getLanguages();
}
