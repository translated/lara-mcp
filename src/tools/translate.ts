import { Translator } from "@translated/lara";
import { z } from "zod";

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
});

const makeInstructions = (text: string) =>
  `Always consider the following contextual information: ${text}`;

export async function translateHandler(args: unknown, lara: Translator) {
  const validatedArgs = translateSchema.parse(args);
  const { text, source, target, context, instructions, adapt_to } = validatedArgs;
  let instructionsList = [...(instructions ?? [])];

  if (context) {
    instructionsList.push(makeInstructions(context));
  }

  const result = await lara.translate(text, source ?? null, target, {
    instructions: instructionsList,
    adaptTo: adapt_to,
  });
  return result.translation;
}
