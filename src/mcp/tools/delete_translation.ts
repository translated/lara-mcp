import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { validateSentenceContext } from "./validators.js";
import { memoryImportSchema } from "./_schemas.js";

export const deleteTranslationOutputSchema = memoryImportSchema;

export const deleteTranslationSchema = z.object({
  id: z
    .array(z.string())
    .describe(
      "The ID or list of IDs where to delete the translation unit from. Format: mem_xyz123"
    ),
  source: z.string().describe("The source language code of the sentence"),
  target: z.string().describe("The target language code of the translation"),
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

export async function deleteTranslation(args: unknown, lara: Translator) {
  const {
    id,
    source,
    target,
    sentence,
    translation,
    tuid,
    sentence_before,
    sentence_after,
  } = deleteTranslationSchema.parse(args);

  validateSentenceContext(sentence_before, sentence_after);

  return lara.memories.deleteTranslation(
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
