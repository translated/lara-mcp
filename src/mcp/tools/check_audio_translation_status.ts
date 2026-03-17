import { Translator } from "@translated/lara";
import { z } from "zod/v4";

export const checkAudioTranslationStatusSchema = z.object({
  id: z.string().describe("The ID of the audio translation job returned by translate_audio."),
});

export async function checkAudioTranslationStatus(args: unknown, lara: Translator) {
  const validatedArgs = checkAudioTranslationStatusSchema.parse(args);
  const { id } = validatedArgs;

  return await lara.audio.status(id);
}
