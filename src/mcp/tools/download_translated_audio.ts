import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { Readable } from "stream";
import { streamToBuffer } from "./translate_image.js";

export const downloadTranslatedAudioSchema = z.object({
  id: z.string().describe("The ID of the audio translation job returned by translate_audio."),
});

export async function downloadTranslatedAudio(args: unknown, lara: Translator) {
  const validatedArgs = downloadTranslatedAudioSchema.parse(args);
  const { id } = validatedArgs;

  const readable = await lara.audio.download(id);
  const resultBuffer = await streamToBuffer(readable as Readable);

  return {
    content: resultBuffer.toString("base64"),
  };
}
