import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { InvalidInputError } from "#exception";

export const downloadTranslatedAudioSchema = z.object({
  id: z.string().describe("The ID of the audio translation job returned by translate_audio."),
  output_path: z
    .string()
    .refine(
      (p) => path.isAbsolute(p),
      "output_path must be an absolute path",
    )
    .refine(
      (p) => !/(^|[\\/])\.\.([\\/]|$)/.test(p),
      'output_path must not contain ".." path segments',
    )
    .describe(
      "The absolute path where the translated audio file will be saved."
    ),
});

export async function downloadTranslatedAudio(args: unknown, lara: Translator) {
  const validatedArgs = downloadTranslatedAudioSchema.parse(args);
  const { id, output_path } = validatedArgs;

  const normalizedOutputPath = path.normalize(output_path);

  // Validate output directory exists and is writable
  const outputDir = path.dirname(normalizedOutputPath);
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    throw new InvalidInputError(`Output directory not found or not writable: ${outputDir}`);
  }

  const readable = await lara.audio.download(id);

  // Write to a temp file first, then atomically rename to avoid
  // destroying a pre-existing file on transient download errors.
  const tempPath = path.join(outputDir, `.lara-download-${crypto.randomBytes(8).toString('hex')}.tmp`);

  try {
    await pipeline(readable, fs.createWriteStream(tempPath));
    fs.renameSync(tempPath, normalizedOutputPath);
  } catch (error) {
    // Best-effort cleanup of temp file only
    try {
      fs.unlinkSync(tempPath);
    } catch { /* ignore cleanup errors */ }
    throw error;
  }

  return { output_path: normalizedOutputPath, message: "Translated audio saved successfully." };
}
