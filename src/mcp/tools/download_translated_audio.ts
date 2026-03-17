import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { InvalidInputError } from "#exception";

export const downloadTranslatedAudioSchema = z.object({
  id: z.string().describe("The ID of the audio translation job returned by translate_audio."),
  output_path: z
    .string()
    .describe(
      "The absolute path where the translated audio file will be saved."
    ),
});

export async function downloadTranslatedAudio(args: unknown, lara: Translator) {
  const validatedArgs = downloadTranslatedAudioSchema.parse(args);
  const { id, output_path } = validatedArgs;

  // Validate output directory exists and is writable
  const outputDir = path.dirname(output_path);
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    throw new InvalidInputError(`Output directory not found or not writable: ${outputDir}`);
  }

  const readable = await lara.audio.download(id);

  try {
    await pipeline(readable, fs.createWriteStream(output_path));
  } catch (error) {
    // Best-effort cleanup of partial file
    try {
      fs.unlinkSync(output_path);
    } catch { /* ignore cleanup errors */ }
    throw error;
  }

  return { output_path, message: "Translated audio saved successfully." };
}
