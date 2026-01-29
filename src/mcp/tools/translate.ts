import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { logger } from "#logger";

export const textBlockSchema = z.object({
  text: z.string(),
  translatable: z.boolean(),
});

export const translateSchema = z.object({
  text: z
    .array(textBlockSchema)
    .describe(
      "An array of text blocks to translate. Each block contains a text string and a boolean indicating whether it should be translated. This allows for selective translation where some text blocks can be preserved in their original form while others are translated."
    ),
  source: z
    .string()
    .optional()
    .describe(
      "The source language code (e.g., 'en-EN' for English). If not specified, the system will attempt to detect it automatically. If you have a hint about the source language, you should specify it in the source_hint field."
    ),
  target: z
    .string()
    .describe(
      "The target language code (e.g., 'it-IT' for Italian). This specifies the language you want the text translated into."
    ),
  context: z
    .string()
    .optional()
    .describe(
      "Additional context string to improve translation quality (e.g., 'This is a legal document' or 'Im talking with a doctor'). This helps the translation system better understand the domain."
    ),
  instructions: z
    .array(z.string())
    .optional()
    .describe(
      "A list of instructions to adjust the network’s behavior regarding the output (e.g., 'Use a formal tone')."
    ),
  source_hint: z
    .string()
    .optional()
    .describe(
      "Used to guide language detection. Specify this when the source language is uncertain to improve detection accuracy."
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
      "Array of glossary IDs to apply during translation (max 10). IDs must match format: gls_* (e.g., ['gls_xyz123', 'gls_abc456']). Glossaries enforce specific terminology and terms."
    ),
  no_trace: z
    .boolean()
    .optional()
    .describe(
      "Privacy flag. If set to true, the translation request will not be traced or logged. Use for sensitive content."
    ),
  priority: z
    .enum(["normal", "background"])
    .optional()
    .describe(
      "Translation priority. 'normal' for real-time translations, 'background' for batch processing with lower priority."
    ),
  timeout_in_millis: z
    .number()
    .int()
    .positive()
    .max(300000)
    .optional()
    .describe(
      "Custom timeout for the translation request in milliseconds. Max: 300000ms (5 minutes). Useful for very long texts."
    ),
});

const makeInstructions = (text: string) =>
  `Always consider the following contextual information: ${text}`;

export async function translateHandler(args: unknown, lara: Translator) {
  const validatedArgs = translateSchema.parse(args);
  const {
    text,
    source,
    target,
    context,
    instructions,
    adapt_to,
    glossaries,
    no_trace,
    priority,
    timeout_in_millis
  } = validatedArgs;
  let instructionsList = [...(instructions ?? [])];

  if (context) {
    instructionsList.push(makeInstructions(context));
  }

  // Audit log for privacy-sensitive requests
  if (no_trace) {
    logger.info({
      action: 'translate',
      privacySensitive: true,
      timestamp: new Date().toISOString()
    }, 'Privacy-sensitive translation requested (noTrace=true)');
  }

  // Build options object dynamically to avoid passing undefined values
  const options: Record<string, unknown> = {};

  if (instructionsList.length > 0) {
    options.instructions = instructionsList;
  }
  if (typeof adapt_to !== "undefined") {
    options.adaptTo = adapt_to;
  }
  if (typeof glossaries !== "undefined") {
    options.glossaries = glossaries;
  }
  if (typeof no_trace !== "undefined") {
    options.noTrace = no_trace;
  }
  if (typeof priority !== "undefined") {
    options.priority = priority;
  }
  if (typeof timeout_in_millis !== "undefined") {
    options.timeoutInMillis = timeout_in_millis;
  }

  const result = await lara.translate(text, source ?? null, target, options);
  return result.translation;
}
