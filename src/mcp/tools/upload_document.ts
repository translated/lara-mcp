import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InvalidInputError } from "#exception";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE * 4 / 3);

export const uploadDocumentSchema = z.object({
  file_content: z
    .string()
    .describe("Base64-encoded file content of the document to translate."),
  filename: z
    .string()
    .min(1)
    .describe("Original filename with extension (e.g., 'report.docx'). Used for format detection."),
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
  no_trace: z
    .boolean()
    .optional()
    .describe("Privacy flag. If true, the request will not be traced or logged."),
  style: z
    .enum(["faithful", "fluid", "creative"])
    .optional()
    .describe("Controls how the translation balances accuracy against natural readability."),
  password: z
    .string()
    .optional()
    .describe("Password for password-protected PDF files."),
  extract_comments: z
    .boolean()
    .optional()
    .describe("DOCX: extract comments for translation."),
  accept_revisions: z
    .boolean()
    .optional()
    .describe("DOCX: accept tracked revisions before translating."),
});

export function buildDocumentOptions(args: {
  adapt_to?: string[];
  glossaries?: string[];
  no_trace?: boolean;
  style?: string;
  password?: string;
  extract_comments?: boolean;
  accept_revisions?: boolean;
  output_format?: string;
}): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  if (typeof args.adapt_to !== "undefined") {
    options.adaptTo = args.adapt_to;
  }
  if (typeof args.glossaries !== "undefined") {
    options.glossaries = args.glossaries;
  }
  if (typeof args.no_trace !== "undefined") {
    options.noTrace = args.no_trace;
  }
  if (typeof args.style !== "undefined") {
    options.style = args.style;
  }
  if (typeof args.password !== "undefined") {
    options.password = args.password;
  }
  if (typeof args.output_format !== "undefined") {
    options.outputFormat = args.output_format;
  }

  const extractionParams: Record<string, boolean> = {};
  if (typeof args.extract_comments !== "undefined") {
    extractionParams.extractComments = args.extract_comments;
  }
  if (typeof args.accept_revisions !== "undefined") {
    extractionParams.acceptRevisions = args.accept_revisions;
  }
  if (Object.keys(extractionParams).length > 0) {
    options.extractionParams = extractionParams;
  }

  return options;
}

export function decodeAndValidateBase64(file_content: string): Buffer {
  if (file_content.length > MAX_BASE64_LENGTH) {
    throw new InvalidInputError("Document too large. Maximum allowed size is 20MB.");
  }
  return Buffer.from(file_content, "base64");
}

export function resultToBase64(result: Buffer | Blob): Promise<string> | string {
  if (Buffer.isBuffer(result)) {
    return result.toString("base64");
  }
  return (result as Blob).arrayBuffer().then(ab => Buffer.from(ab).toString("base64"));
}

export async function uploadDocument(args: unknown, lara: Translator) {
  const validatedArgs = uploadDocumentSchema.parse(args);
  const { file_content, filename, source, target } = validatedArgs;

  const fileBuffer = decodeAndValidateBase64(file_content);
  const safeName = path.basename(filename);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lara-doc-"));
  const tempFilePath = path.join(tempDir, safeName);

  try {
    fs.writeFileSync(tempFilePath, fileBuffer, { mode: 0o600 });
    const options = buildDocumentOptions(validatedArgs);
    return await lara.documents.upload(tempFilePath, filename, source ?? null, target, options);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
