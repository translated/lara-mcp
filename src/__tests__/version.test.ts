import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PACKAGE_VERSION } from "../version.js";

describe("PACKAGE_VERSION", () => {
  it("matches the version declared in package.json", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "..", "..", "package.json"), "utf8")
    ) as { version: string };

    expect(PACKAGE_VERSION).toBe(pkg.version);
    expect(PACKAGE_VERSION).not.toBe("unknown");
  });
});
