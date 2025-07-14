import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
  const MAX_TMX_SIZE = 5 * 1024 * 1024; // 5MB
  if (Buffer.byteLength(tmx_content, 'utf8') > MAX_TMX_SIZE) {
    throw new Error("TMX file too large. Maximum allowed size is 5MB.");
  }

  const tempDir = path.join(os.tmpdir(), 'lara-tmx-imports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `tmx-${Date.now()}-${Math.random().toString(36).slice(2)}.tmx`);

  try {
    fs.writeFileSync(tempFilePath, tmx_content);

    return await lara.memories.importTmx(id, tempFilePath);
  } catch (err) {
    throw err;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}