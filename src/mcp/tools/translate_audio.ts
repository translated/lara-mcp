import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "#logger";
import { buildDocumentOptions, decodeAndValidateBase64 } from "./upload_document.js";

export const translateAudioSchema = z.object({
  file_content: z
    .string()
    .describe(
      "Base64-encoded audio file content."
    ),
  filename: z
    .string()
    .min(1)
    .describe(
      "Original filename with extension (e.g., 'recording.mp3'). Used for format detection."
    ),
  target: z
    .string()
    .describe(
      "The target language code (e.g., 'it-IT' for Italian)."
    ),
  source: z
    .string()
    .optional()
    .describe(
      "The source language code. If not specified, the system will attempt to detect it automatically."
    ),
  adapt_to: z
    .array(z.string())
    .optional()
    .describe(
      "A list of translation memory IDs for adapting the translation."
    ),
  glossaries: z
    .array(
      z.string()
        .min(1)
        .max(255)
        .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    )
    .max(10)
    .optional()
    .describe(
      "Array of glossary IDs to apply during translation (max 10). IDs must match format: gls_* (e.g., ['gls_xyz123'])."
    ),
  no_trace: z
    .boolean()
    .optional()
    .describe(
      "Privacy flag. If set to true, the request content will not be stored or traced by Lara."
    ),
  style: z
    .enum(["faithful", "fluid", "creative"])
    .optional()
    .describe(
      "Controls how the translation balances accuracy against natural readability."
    ),
  voice_gender: z
    .enum(["male", "female"])
    .optional()
    .describe(
      "The gender of the voice for the translated audio output."
    ),
});

export async function translateAudio(args: unknown, lara: Translator) {
  const validatedArgs = translateAudioSchema.parse(args);
  const { file_content, filename, target, source, voice_gender } = validatedArgs;

  const fileBuffer = decodeAndValidateBase64(file_content, "Audio file");

  // Audit log for privacy-sensitive requests
  if (validatedArgs.no_trace) {
    logger.info({
      action: 'translate_audio',
      privacySensitive: true,
      timestamp: new Date().toISOString()
    }, 'Privacy-sensitive audio translation requested (noTrace=true)');
  }

  const options = buildDocumentOptions(validatedArgs);
  if (typeof voice_gender !== "undefined") {
    options.voiceGender = voice_gender;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lara-audio-"));
  const tempFilePath = path.join(tempDir, "upload");

  try {
    fs.writeFileSync(tempFilePath, fileBuffer, { mode: 0o600 });
    return await lara.audio.upload(tempFilePath, filename, source ?? null, target, options);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
