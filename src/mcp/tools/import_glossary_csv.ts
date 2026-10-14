import { Translator } from "@translated/lara";
import { z } from "zod/v4";
import { withTempFile } from "./file-utils.js";
import { glossaryFileFormatSchema, glossaryIdSchema, glossaryImportSchema } from "./_schemas.js";

export const importGlossaryCsvOutputSchema = glossaryImportSchema;

export const importGlossaryCsvSchema = z.object({
  id: glossaryIdSchema
    .describe("The glossary ID (format: gls_*, e.g., 'gls_xyz123')"),
  csv_content: z
    .string()
    .describe("The content of the CSV file to upload"),
  content_type: glossaryFileFormatSchema
    .default("csv/table-uni")
    .describe("The format of the CSV file. 'csv/table-uni' for unidirectional, 'csv/table-multi' for multidirectional"),
  gzip: z
    .boolean()
    .optional()
    .describe("Whether the CSV content is gzip compressed"),
});

export async function importGlossaryCsv(args: unknown, lara: Translator) {
  const { id, csv_content, content_type, gzip } = importGlossaryCsvSchema.parse(args);

  return withTempFile(csv_content, "lara-csv-", "import.csv", (tempFilePath) =>
    lara.glossaries.importCsv(id, tempFilePath, content_type, gzip)
  );
}
