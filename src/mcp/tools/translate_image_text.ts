import { Translator } from "@translated/lara";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildDocumentOptions, decodeAndValidateBase64 } from "./upload_document.js";
import { imageBaseSchema } from "./translate_image.js";

export const translateImageTextSchema = imageBaseSchema;

export async function translateImageText(args: unknown, lara: Translator) {
  const validatedArgs = translateImageTextSchema.parse(args);
  const { file_content, source, target } = validatedArgs;

  const fileBuffer = decodeAndValidateBase64(file_content, "Image");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lara-img-"));
  const tempFilePath = path.join(tempDir, "upload");

  try {
    fs.writeFileSync(tempFilePath, fileBuffer, { mode: 0o600 });
    const options = buildDocumentOptions(validatedArgs);
    return await lara.images.translateText(tempFilePath, source ?? null, target, options);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
