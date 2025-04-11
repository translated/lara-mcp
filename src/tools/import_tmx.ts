import { Translator } from "@translated/lara";
import { z } from "zod";
import * as fs from "fs";

export const importTmxSchema = z.object({
  id: z
    .string()
    .describe("The ID of the memory to update. Format: mem_xyz123."),
  tmx: z.string().describe("The absolute path to the tmx file to upload"),
  gzip: z
    .boolean()
    .describe("Indicates if the file is a compressed .gz file")
    .optional(),
});

export async function importTmx(args: any, lara: Translator) {
  const validatedArgs = importTmxSchema.parse(args);
  const { id, tmx, gzip = false } = validatedArgs;

  const file = fs.createReadStream(tmx);
  return await lara.memories.importTmx(id, file, gzip);
}
