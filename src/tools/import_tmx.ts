import { Translator } from "@translated/lara";
import { z } from "zod";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const importTmxSchema = z.object({
  id: z
      .string()
      .describe(
          "The ID of the memory to update. Format: mem_xyz123."
      ),
  tmx_content: z
      .string()
      .describe(
          "The content of the tmx file to upload. Don't provide this if you choose to use tmx_url."
      )
      .optional(),
  tmx_url: z
      .string()
      .describe(
          "A URL to the tmx file to upload. Don't provide this if you choose to use tmx_content."
      )
      .optional(),
  gzip: z
      .boolean()
      .describe(
          "Indicates if the file is a compressed .gz file"
      )
      .optional(),
});

export async function importTmx(args: any, lara: Translator) {
  const validatedArgs = importTmxSchema.parse(args);
  const { id, tmx_content, tmx_url, gzip } = validatedArgs;

  if (tmx_content && tmx_url) {
    throw new Error("You can't provide both tmx_content and tmx_url.");
  }

  if (!tmx_content && !tmx_url) {
    throw new Error("You must provide either tmx_content or tmx_url.");
  }

  const tempDir = path.join(os.tmpdir(), 'lara-tmx-imports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `tmx-${Date.now()}-${Math.random().toString(36).slice(2)}.tmx`);

  try {
    if (tmx_url) {
      await execAsync(`curl -L "${tmx_url}" -o "${tempFilePath}"`);
    } else if (tmx_content) {
      fs.writeFileSync(tempFilePath, tmx_content);
    }

    return await lara.memories.importTmx(id, tempFilePath, gzip);
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
