import { Translator, type TranslateOptions } from "@translated/lara";
import type { ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { logger } from "#logger";
import { errorTypeFor } from "../../metrics.js";
import { glossaryIdSchema, textBlockSchema } from "./_schemas.js";

export { textBlockSchema };

const MAX_TEXT_BLOCKS = 128;
/** Lara rejects more (400); the context travels as one of them. */
export const MAX_INSTRUCTIONS = 10;
/** What Lara accepts as source_hint ("en", "en-GB", "zh-Hans"); anything else (e.g. "Russian") it 400s. */
const LANGUAGE_CODE = /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/i;

const reasoningWarningSchema = z.object({
  applied: z.boolean(),
  error: z.object({ statusCode: z.number(), message: z.string() }).optional(),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })).optional(),
});

export const translateOutputSchema = z.object({
  warnings: z.object({ reasoning: reasoningWarningSchema }).optional(),
  items: z
    .array(textBlockSchema)
    .describe(
      "Translated text blocks, in the same order and structure as the input. Blocks marked translatable: false are preserved verbatim."
    ),
});

export const translateSchema = z.object({
  // A bare string is read as one block, and so is each string in the array: models send both.
  text: z.preprocess((text) => (typeof text === "string" ? [text] : text), z
    .array(z.preprocess((block) => (typeof block === "string" ? { text: block } : block), textBlockSchema))
    .min(1)
    .max(MAX_TEXT_BLOCKS))
    .describe(
      "An array of text blocks to translate. Each block contains a text string and a boolean indicating whether it should be translated. This allows for selective translation where some text blocks can be preserved in their original form while others are translated. " +
      `Max ${MAX_TEXT_BLOCKS} blocks per call: split larger inputs into multiple calls.`
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
      "The target language code (e.g., 'it-IT' for Italian). This specifies the single language you want the text translated into. " +
      "This field accepts ONE language code only. If the user wants the text translated into multiple languages, call this tool once per target language."
    ),
  context: z
    .string()
    .optional()
    .describe(
      "Additional context string to improve translation quality (e.g., 'This is a legal document' or 'Im talking with a doctor'). This helps the translation system better understand the domain."
    ),
  instructions: z
    // Length not enforced: Lara accepts much longer instructions. Past MAX_INSTRUCTIONS they are joined.
    .array(z.string())
    .optional()
    .describe(
      `Optional list of short localization directives to adjust translation output. ` +
      `Keep each instruction short (about 20 words), at most ${MAX_INSTRUCTIONS} in total, counting 'context' as one. ` +
      `These are NOT free-form LLM prompts — they are expert localization directives about formality, tone, or domain-specific terminology. ` +
      `Only provide instructions when the content specifically requires them; omitting instructions for general content preserves higher translation quality. ` +
      `Do NOT combine contradictory instructions (e.g., formal and informal tone together). ` +
      `Examples: 'Translate formally', 'Use a creative and concise tone', 'Make translation gender-neutral', ` +
      `'Mask any price with the [price] placeholder', 'Use quotation marks (« ») for quotations'.`
    ),
  source_hint: z
    .string()
    .optional()
    .describe(
      "A language code (e.g., 'en' or 'en-GB', not a language name) to guide detection when 'source' is not given. Ignored when 'source' is set."
    ),
  adapt_to: z
    .array(z.string())
    .optional()
    .describe(
      "A list of translation memory IDs (format 'mem_*') for adapting the translation. " +
      "If the user refers to a memory by name rather than by ID, call list_memories first to resolve the name to its ID before calling this tool."
    ),
  glossaries: z
    .array(glossaryIdSchema)
    .max(10)
    .optional()
    .describe(
      "Array of glossary IDs to apply during translation (max 10). IDs must match format: gls_* (e.g., ['gls_xyz123', 'gls_abc456']). Glossaries enforce specific terminology and terms. " +
      "If the user refers to a glossary by name rather than by ID (e.g., 'my company glossary'), call list_glossaries first to resolve the name to its ID before calling this tool."
    ),
  no_trace: z
    .boolean()
    .optional()
    .describe(
      "Privacy flag. If set to true, the request content will not be stored or traced by Lara. Use for sensitive content."
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
  style: z
    .enum(["faithful", "fluid", "creative"])
    .optional()
    .describe(
      "Controls how the translation balances accuracy against natural readability. 'faithful' stays close to the source, 'fluid' prioritizes natural readability, 'creative' allows more freedom in the translation."
    ),
  reasoning_effort: z.enum(["low", "medium", "high"]).optional()
    .describe("Lara Think reasoning level. Ignored unless reasoning is true; defaults to high."),
  reasoning: z
    .boolean()
    .optional()
    .describe(
      "Enables Lara Think multi-step linguistic analysis. Can increase processing time up to 10x but may improve translation quality for complex texts. " +
      "If the account's plan does not include Lara Think, the text is translated without it and warnings.reasoning says so."
    ),
  content_type: z
    .enum(["text/plain", "text/html", "application/xliff+xml"])
    .optional()
    .describe(
      "Specifies the content type of the text. Autodetected if omitted."
    ),
});

const makeInstructions = (text: string) =>
  `Always consider the following contextual information: ${text}`;

const THINK_NOT_IN_PLAN = {
  applied: false,
  error: { statusCode: 403, message: "Lara Think is not included in this account's plan: translated without it." },
};

export async function translateHandler(args: unknown, lara: Translator, mcpContext?: ServerContext) {
  const {
    text,
    source,
    target,
    context,
    instructions,
    source_hint,
    adapt_to,
    glossaries,
    no_trace,
    priority,
    timeout_in_millis,
    style,
    reasoning,
    reasoning_effort,
    content_type
  } = translateSchema.parse(args);
  let instructionsList = [...(instructions ?? [])];

  if (context) {
    instructionsList.push(makeInstructions(context));
  }
  // ponytail: joined rather than rejected, so the directives still reach Lara.
  if (instructionsList.length > MAX_INSTRUCTIONS) {
    instructionsList = [
      ...instructionsList.slice(0, MAX_INSTRUCTIONS - 1),
      instructionsList.slice(MAX_INSTRUCTIONS - 1).join(" "),
    ];
  }

  // Lara 400s empty blocks and a call with nothing to translate: those blocks are returned as given.
  const blocks = text.filter((block) => block.text !== "");
  if (!blocks.some((block) => block.translatable !== false)) return text;

  // Audit log for privacy-sensitive requests
  if (no_trace) {
    logger.info({
      action: 'translate',
      privacySensitive: true,
      timestamp: new Date().toISOString()
    }, 'Privacy-sensitive translation requested (noTrace=true)');
  }

  // Build options object dynamically to avoid passing undefined values
  const options: TranslateOptions = {};

  if (instructionsList.length > 0) {
    options.instructions = instructionsList;
  }
  // Lara 400s a source_hint next to a source, or one that is not a language code. It is only a hint.
  if (!source && source_hint && LANGUAGE_CODE.test(source_hint)) {
    options.sourceHint = source_hint;
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
  if (typeof style !== "undefined") {
    options.style = style;
  }
  if (typeof reasoning !== "undefined") {
    options.reasoning = reasoning;
    // Models send a level without reasoning: true; rejecting it failed the translation, so it is dropped.
    if (reasoning) options.reasoningEffort = reasoning_effort ?? "high";
  }
  if (typeof content_type !== "undefined") {
    options.contentType = content_type;
  }

  const progressToken = mcpContext?.mcpReq?._meta?.progressToken;
  let progress = 0;
  let notifications = Promise.resolve();
  const onPartial = reasoning && mcpContext && progressToken !== undefined ? () => {
    const update = ++progress;
    // Lara's callback is synchronous; serialize sends and drain them before the final response.
    notifications = notifications.then(async () => {
      if (mcpContext.mcpReq.signal.aborted) return;
      await mcpContext.mcpReq.notify({
        method: "notifications/progress",
        params: { progressToken, progress: update, message: "Received a translation update from Lara Think" },
      });
    }).catch(() => {
      logger.debug("Could not send Lara Think progress notification");
    });
  } : undefined;

  try {
    let reasoningWarning;
    const result = await lara.translate(blocks, source ?? null, target, options, onPartial).catch((error) => {
      // A plan without Lara Think 403s the whole call: translate without it rather than fail.
      if (!reasoning || errorTypeFor(error) !== "forbidden_403") throw error;
      reasoningWarning = THINK_NOT_IN_PLAN;
      const { reasoningEffort: _effort, ...withoutThink } = options;
      return lara.translate(blocks, source ?? null, target, { ...withoutThink, reasoning: false });
    });

    let next = 0;
    const translation = blocks.length === text.length
      ? result.translation
      : text.map((block) => (block.text === "" ? block : result.translation[next++]));
    reasoningWarning ??= result.warnings?.reasoning;
    return reasoningWarning ? { items: translation, warnings: { reasoning: reasoningWarning } } : translation;
  } finally {
    await notifications;
  }
}
