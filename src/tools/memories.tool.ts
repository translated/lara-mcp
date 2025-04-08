import { z } from "zod";
import { Translator} from "@translated/lara";

export const createMemorySchema = z.object({
    external_id: z
        .string()
        .describe(
            "The ID of the memory to be imported from MyMemory. Use this to initialize the memory with external content. Format: ext_my_[MyMemory ID]"
        )
        .optional(),
    name: z
        .string()
        .describe(
            "Custom name of the memory, it can be any string including spaces and special characters and non-latin alphabets. Max length: 250 characters."
        )
        .refine((name) => name.length <= 250, {
            message: "Name can't be more than 250 characters",
        }),
})

export const deleteMemorySchema = z.object({
    id: z
    .string()
        .describe(
        "The unique identifier of the memory to update. Format: mem_xyz123"
    ),
})

export const updateMemorySchema = z.object({
    id: z.
    string()
        .describe(
            "The unique identifier of the memory to update. Format: mem_xyz123"
        ),
    name: z
        .string()
        .describe(
            "Custom name of the memory, it can be any string including spaces and special characters and non-latin alphabets. Max length: 250 characters."
        )
        .refine((name) => name.length <= 250, {
            message: "Name can't be more than 250 characters",
        }),
})

export const addTranslationSchema = z.object({
    id: z.string()
        .describe(
            "The unique identifier of the memory to update. Format: mem_xyz123"
        ),
    source: z
        .string()
        .describe(
            "The source language code (e.g., 'en-EN' for English). If not specified, the system will attempt to detect it automatically. If you have a hint about the source language, you should specify it in the source_hint field."
        ),
    target: z
        .string()
        .describe(
            "The target language code (e.g., 'it-IT' for Italian). This specifies the language you want the text translated into."
        ),
    sentence: z
        .string()
        .describe(
            "The source sentence. The block of text before it has been translated."
        ),
    translation: z
        .string()
        .describe(
            "The translated sentence. The block of text after it has been translated."
        ),
    tuid: z
        .string()
        .describe(
            "Translation Unit unique identifier"
        )
        .optional(),
    sentence_before: z
        .string()
        .describe(
            "The sentence before the source sentence to specify the context of the translation unit"
        )
        .optional(),
    sentence_after: z
        .string()
        .describe(
            "The sentence after the source sentence to specify the context of the translation unit"
        )
        .optional(),
})

export const deleteTranslationSchema = z.object({
    id: z.string()
        .describe(
            "The unique identifier of the memory to update. Format: mem_xyz123"
        ),
    source: z
        .string()
        .describe(
            "The source language code (e.g., 'en-EN' for English). If not specified, the system will attempt to detect it automatically. If you have a hint about the source language, you should specify it in the source_hint field."
        ),
    target: z
        .string()
        .describe(
            "The target language code (e.g., 'it-IT' for Italian). This specifies the language you want the text translated into."
        ),
    sentence: z
        .string()
        .describe(
            "The source sentence. The block of text before it has been translated."
        ),
    translation: z
        .string()
        .describe(
            "The translated sentence. The block of text after it has been translated."
        ),
    tuid: z
        .string()
        .describe(
            "Translation Unit unique identifier"
        )
        .optional(),
    sentence_before: z
        .string()
        .describe(
            "The sentence before the source sentence to specify the context of the translation unit"
        )
        .optional(),
    sentence_after: z
        .string()
        .describe(
            "The sentence after the source sentence to specify the context of the translation unit"
        )
        .optional(),
})

export async function createMemory(args: any, lara: Translator) {
    const validatedArgs = createMemorySchema.parse(args);
    const { external_id, name } = validatedArgs;
    if (external_id) {
        return await lara.memories.create(name, external_id);
    }
    return await lara.memories.create(name);
}

export async function deleteMemory(args: any, lara: Translator) {
    const validatedArgs = deleteMemorySchema.parse(args);
    const { id } = validatedArgs;
    return await lara.memories.delete(id);
}

export async function updateMemory(args: any, lara: Translator) {
    const validatedArgs = updateMemorySchema.parse(args);
    const { id, name } = validatedArgs;
    return await lara.memories.update(id, name);
}

export async function addTranslation(args: unknown, lara: Translator) {
    const validatedArgs = addTranslationSchema.parse(args);
    const { id, source, target, sentence, translation, tuid, sentence_before, sentence_after } = validatedArgs

    if (!tuid) {
        return await lara.memories.addTranslation(id, source, target, sentence, translation);
    }

    if ((sentence_before && !sentence_after) || (!sentence_before && sentence_after)) {
        throw new Error('Please provide both sentence_before and sentence_after')
    }

    return await lara.memories.addTranslation(id, source, target, sentence, translation, tuid, sentence_before, sentence_after);
}

export async function deleteTranslation(args: any, lara: Translator) {
    const validatedArgs = deleteTranslationSchema.parse(args);
    const { id, source, target, sentence, translation, tuid, sentence_before, sentence_after } = validatedArgs

    if (!tuid) {
        return await lara.memories.deleteTranslation(id, source, target, sentence, translation);
    }

    if ((sentence_before && !sentence_after) || (!sentence_before && sentence_after)) {
        throw new Error('Please provide both sentence_before and sentence_after')
    }

    return await lara.memories.deleteTranslation(id, source, target, sentence, translation, tuid, sentence_before, sentence_after);
}

