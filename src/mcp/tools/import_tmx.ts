import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InvalidInputError } from "#exception";

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

export async function importTmx(args: any, lara: Translator) {
  const validatedArgs = importTmxSchema.parse(args);
  const { id, tmx_content } = validatedArgs;

  // File size limit: 5MB
  const MAX_TMX_SIZE = 5 * 1024 * 1024;
  if (Buffer.byteLength(tmx_content, 'utf8') > MAX_TMX_SIZE) {
    throw new InvalidInputError("TMX file too large. Maximum allowed size is 5MB.");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lara-tmx-'));
  const tempFilePath = path.join(tempDir, 'import.tmx');

  try {
    fs.writeFileSync(tempFilePath, tmx_content, { mode: 0o600 });

    return await lara.memories.importTmx(id, tempFilePath);
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
    } catch (_) { /* best-effort cleanup */ }
  }
}