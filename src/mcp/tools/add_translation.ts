import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const addTranslationSchema = z.object({
  id: z
    .array(z.string())
    .describe(
      "The ID or list of IDs where to save the translation unit. Format: mem_xyz123"
    ),
  source: z
    .string()
    .describe(
      "The source language code of the sentence, it MUST be a language supported by the system, use the list_languages tool to get a list of all the supported languages"
    ),
  target: z
    .string()
    .describe(
      "The target language code of the translation, it MUST be a language supported by the system, use the list_languages tool to get a list of all the supported languages"
    ),
  sentence: z.string().describe("The source sentence"),
  translation: z.string().describe("The translated sentence"),
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
