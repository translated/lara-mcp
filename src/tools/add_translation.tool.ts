import { Translator } from "@translated/lara";
import { z } from "zod";

export const addTranslationSchema = z.object({
  id: z
    .string()
    .describe(
      "The unique identifier of the memory to update. Format: mem_xyz123"
    ),
  source: z
    .string()
    .describe(
      "The source language code (e.g., 'en-EN' for English). If not specified, the system will attempt to detect it automatically. If you have a hint about the source language, you should specify it in the source_hint field."
    ),
  target: z
    .string()
    .describe(
      "The target language code (e.g., 'it-IT' for Italian). This specifies the language you want the text translated into."
    ),
  sentence: z
    .string()
    .describe(
      "The source sentence. The block of text before it has been translated."
    ),
  translation: z
    .string()
    .describe(
      "The translated sentence. The block of text after it has been translated."
    ),
  tuid: z.string().describe("Translation Unit unique identifier").optional(),
  sentence_before: z
    .string()
    .describe(
      "The sentence before the source sentence to specify the context of the translation unit"
    )
    .optional(),
  sentence_after: z
    .string()
    .describe(
      "The sentence after the source sentence to specify the context of the translation unit"
    )
    .optional(),
});

export async function addTranslation(args: unknown, lara: Translator) {
  const validatedArgs = addTranslationSchema.parse(args);
  const {
    id,
    source,
    target,
    sentence,
    translation,
    tuid,
    sentence_before,
    sentence_after,
  } = validatedArgs;

  if (!tuid) {
    return await lara.memories.addTranslation(
      id,
      source,
      target,
      sentence,
      translation
    );
  }

  if (
    (sentence_before && !sentence_after) ||
    (!sentence_before && sentence_after)
  ) {
    throw new Error("Please provide both sentence_before and sentence_after");
  }

  return await lara.memories.addTranslation(
    id,
    source,
    target,
    sentence,
    translation,
    tuid,
    sentence_before,
    sentence_after
  );
}
