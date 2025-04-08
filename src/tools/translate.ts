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
  memory: z
      .array(z.string())
      .optional()
      .describe(
          "The ID of the memory to be used in the next translation. Translations, stored inside memories, provide additional context to improve translation quality, coming from previously translated text segments. Each memory can have multiple translations. These translations have a sentence field, for the source sentence, and a translation field, for the translated sentence (e.g., source sentence: 'Ciao mondo!', translation sentence: 'Hello world!'). Context information and translation unit unique ID can be specified (they can have a sentence_before and a sentence_after the source sentence to specify the context of the translation unit). This helps the translation system better understand the domain."
      ),
});

const makeInstructions = (text: string) =>
  `Always consider the following contextual information: ${text}`;

export async function translateHandler(args: unknown, lara: Translator) {
  const validatedArgs = translateSchema.parse(args);
  const { text, source, target, context, instructions, memory } = validatedArgs;
  let instructionsList = [...(instructions ?? [])];

  if (context) {
    instructionsList.push(makeInstructions(context));
  }

  if (memory) {
    const result = await lara.translate(text, source ?? null, target, {
      instructions: instructionsList,
      adaptTo: memory
    });
    return result.translation;
  }

  const result = await lara.translate(text, source ?? null, target, {
    instructions: instructionsList,
  });
  return result.translation;
}
