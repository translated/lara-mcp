import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InvalidInputError } from "#exception";

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Write import content to a private temp file, run the callback with its path, then remove the
 * whole directory. Each call gets its own 0700 directory (mkdtemp) so concurrent imports cannot
 * see or clobber each other's files.
 *
 * @param content - The file content to write
 * @param prefix - Temp directory name prefix
 * @param fileName - Name of the file created inside the temp directory
 * @param callback - Async function that receives the temp file path
 * @returns The result of the callback
 */
export async function withTempFile<T>(
  content: string,
  prefix: string,
  fileName: string,
  callback: (filePath: string) => Promise<T>
): Promise<T> {
  if (Buffer.byteLength(content, "utf8") > MAX_IMPORT_FILE_SIZE) {
    throw new InvalidInputError("File too large. Maximum allowed size is 5MB.");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const tempFilePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(tempFilePath, content, { mode: 0o600 });
    return await callback(tempFilePath);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) { /* best-effort cleanup */ }
  }
}
