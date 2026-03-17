import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as path from "path";
import { logger } from "#logger";
import { InvalidInputError } from "#exception";

export const translateAudioSchema = z.object({
  file_path: z
    .string()
    .refine(
      (p) => path.isAbsolute(p),
      "file_path must be an absolute path",
    )
    .refine(
      (p) => !/(^|[\\/])\.\.([\\/]|$)/.test(p),
      'file_path must not contain ".." path segments',
    )
    .describe(
      "The absolute path to the audio file to translate."
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
  const {
    file_path: filePath,
    target,
    source,
    adapt_to,
    glossaries,
    no_trace,
    style,
    voice_gender,
  } = validatedArgs;

  const normalizedFilePath = path.normalize(filePath);

  // Validate file exists and is readable
  try {
    fs.accessSync(normalizedFilePath, fs.constants.R_OK);
  } catch {
    throw new InvalidInputError(`File not found or not readable: ${normalizedFilePath}`);
  }

  const filename = path.basename(normalizedFilePath);

  // Audit log for privacy-sensitive requests
  if (no_trace) {
    logger.info({
      action: 'translate_audio',
      privacySensitive: true,
      timestamp: new Date().toISOString()
    }, 'Privacy-sensitive audio translation requested (noTrace=true)');
  }

  // Build options object dynamically to avoid passing undefined values
  const options: Record<string, unknown> = {};

  if (typeof adapt_to !== "undefined") {
    options.adaptTo = adapt_to;
  }
  if (typeof glossaries !== "undefined") {
    options.glossaries = glossaries;
  }
  if (typeof no_trace !== "undefined") {
    options.noTrace = no_trace;
  }
  if (typeof style !== "undefined") {
    options.style = style;
  }
  if (typeof voice_gender !== "undefined") {
    options.voiceGender = voice_gender;
  }

  return await lara.audio.upload(normalizedFilePath, filename, source ?? null, target, options);
}
