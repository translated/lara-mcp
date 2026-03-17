import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { resultToBase64 } from "./upload_document.js";

export const downloadDocumentSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("The document ID to download."),
  output_format: z
    .enum(["pdf"])
    .optional()
    .describe("Output format. Only applicable for PDF source files."),
});

export async function downloadDocument(args: unknown, lara: Translator) {
  const validatedArgs = downloadDocumentSchema.parse(args);
  const { id, output_format } = validatedArgs;

  const options: Record<string, unknown> = {};
  if (typeof output_format !== "undefined") {
    options.outputFormat = output_format;
  }

  const result = await lara.documents.download(id, options);

  return {
    content: await resultToBase64(result),
  };
}
