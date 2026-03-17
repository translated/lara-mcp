import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const detectLanguageSchema = z.object({
  text: z
    .union([z.string(), z.array(z.string()).max(128)])
    .describe(
      "The text to detect the language of. Can be a single string or an array of strings (up to 128 elements)."
    ),
  hint: z
    .string()
    .optional()
    .describe(
      "Optional language code hint to guide detection (e.g., 'en-EN')."
    ),
  passlist: z
    .array(z.string())
    .optional()
    .describe(
      "Optional list of language codes to restrict detection results to."
    ),
});

export async function detectLanguage(args: unknown, lara: Translator) {
  const { text, hint, passlist } = detectLanguageSchema.parse(args);

  return lara.detect(text, hint, passlist);
}
