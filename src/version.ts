import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read this package's version once at module load so it can be sent as the
// X-Lara-Client-Version header on every Lara SDK call and reported by the
// server-info route. package.json sits next to the source dir in dev
// (src/version.ts) and next to dist/ in the published package (dist/version.js),
// so "../package.json" resolves in both layouts. Fall back to "unknown" so a
// missing/unreadable file degrades gracefully instead of crashing on import.
function loadPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")
    ) as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

export const PACKAGE_VERSION = loadPackageVersion();
