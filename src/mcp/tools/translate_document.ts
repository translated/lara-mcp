import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  uploadDocumentSchema,
  buildDocumentOptions,
  decodeAndValidateBase64,
  resultToBase64,
} from "./upload_document.js";

export const translateDocumentSchema = uploadDocumentSchema.extend({
  output_format: z
    .enum(["pdf"])
    .optional()
    .describe("Output format. Only applicable for PDF source files."),
});

export async function translateDocument(args: unknown, lara: Translator) {
  const validatedArgs = translateDocumentSchema.parse(args);
  const { file_content, filename, source, target } = validatedArgs;

  const fileBuffer = decodeAndValidateBase64(file_content);
  const safeName = path.basename(filename);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lara-doc-"));
  const tempFilePath = path.join(tempDir, safeName);

  try {
    fs.writeFileSync(tempFilePath, fileBuffer, { mode: 0o600 });
    const options = buildDocumentOptions(validatedArgs);
    const result = await lara.documents.translate(tempFilePath, filename, source ?? null, target, options);

    return {
      content: await resultToBase64(result),
      filename: filename,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
