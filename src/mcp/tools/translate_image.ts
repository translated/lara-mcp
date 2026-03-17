import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Readable } from "stream";
import { buildDocumentOptions, decodeAndValidateBase64 } from "./upload_document.js";

export const imageBaseSchema = z.object({
  file_content: z
    .string()
    .describe("Base64-encoded image file content."),
  source: z
    .string()
    .optional()
    .describe("Source language code (e.g., 'en-EN'). Auto-detected if omitted."),
  target: z
    .string()
    .describe("Target language code (e.g., 'it-IT')."),
  adapt_to: z
    .array(z.string())
    .optional()
    .describe("A list of translation memory IDs for adapting the translation."),
  glossaries: z
    .array(
      z.string()
        .min(1)
        .max(255)
        .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    )
    .max(10)
    .optional()
    .describe("Array of glossary IDs to apply during translation (max 10). IDs must match format: gls_*."),
  style: z
    .enum(["faithful", "fluid", "creative"])
    .optional()
    .describe("Controls how the translation balances accuracy against natural readability."),
  no_trace: z
    .boolean()
    .optional()
    .describe("Privacy flag. If true, the request will not be traced or logged."),
});

export const translateImageSchema = imageBaseSchema.extend({
  text_removal: z
    .enum(["overlay", "inpainting"])
    .optional()
    .describe("Method for removing source text from the image. 'overlay' covers text with a solid background, 'inpainting' attempts to reconstruct the background."),
});

export function detectImageExtension(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return ".png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return ".gif";
  }
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return ".webp";
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return ".bmp";
  }
  return ".png";
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function translateImage(args: unknown, lara: Translator) {
  const validatedArgs = translateImageSchema.parse(args);
  const { file_content, source, target, text_removal } = validatedArgs;

  const fileBuffer = decodeAndValidateBase64(file_content, "Image");

  const ext = detectImageExtension(fileBuffer);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lara-img-"));
  const tempFilePath = path.join(tempDir, `upload${ext}`);

  try {
    fs.writeFileSync(tempFilePath, fileBuffer, { mode: 0o600 });
    const options = buildDocumentOptions(validatedArgs);
    if (typeof text_removal !== "undefined") {
      options.textRemoval = text_removal;
    }
    const stream = await lara.images.translate(tempFilePath, source ?? null, target, options);
    const resultBuffer = await streamToBuffer(stream as Readable);

    return {
      content: resultBuffer.toString("base64"),
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
