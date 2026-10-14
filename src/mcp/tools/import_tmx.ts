import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { withTempFile } from "./file-utils.js";
import { memoryImportSchema } from "./_schemas.js";

export const importTmxOutputSchema = memoryImportSchema;

export const importTmxSchema = z.object({
  id: z
      .string()
      .describe(
          "The ID of the memory to update. Format: mem_xyz123."
      ),
  tmx_content: z
      .string()
      .describe(
          "The content of the tmx file to upload."
      ),
});

export async function importTmx(args: unknown, lara: Translator) {
  const { id, tmx_content } = importTmxSchema.parse(args);

  return withTempFile(tmx_content, "lara-tmx-", "import.tmx", (tempFilePath) =>
    lara.memories.importTmx(id, tempFilePath)
  );
}
