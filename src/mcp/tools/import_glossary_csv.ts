import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InvalidInputError } from "#exception";

export const importGlossaryCsvSchema = z.object({
  id: z.string()
    .min(1)
    .max(255)
    .regex(/^gls_[a-zA-Z0-9_-]+$/, "Invalid glossary ID format")
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  csv_content: z
    .string()
    .describe("The content of the CSV file to upload"),
  content_type: z
    .enum(["csv/table-uni", "csv/table-multi"])
    .default("csv/table-uni")
    .describe("The format of the CSV file. 'csv/table-uni' for unidirectional, 'csv/table-multi' for multidirectional"),
  gzip: z
    .boolean()
    .optional()
    .describe("Whether the CSV content is gzip compressed"),
});

export async function importGlossaryCsv(args: any, lara: Translator) {
  const validatedArgs = importGlossaryCsvSchema.parse(args);
  const { id, csv_content, content_type, gzip } = validatedArgs;

  // File size limit: 5MB
  const MAX_CSV_SIZE = 5 * 1024 * 1024;
  if (Buffer.byteLength(csv_content, 'utf8') > MAX_CSV_SIZE) {
    throw new InvalidInputError("CSV file too large. Maximum allowed size is 5MB.");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lara-csv-'));
  const tempFilePath = path.join(tempDir, 'import.csv');

  try {
    fs.writeFileSync(tempFilePath, csv_content, { mode: 0o600 });

    return await lara.glossaries.importCsv(id, tempFilePath, content_type, gzip);
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
    } catch (_) { /* best-effort cleanup */ }
  }
}
