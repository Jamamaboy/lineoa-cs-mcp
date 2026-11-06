import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Reads our own package.json, from src/ or dist/src/ alike, so the version has one source. */
function readVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const file = join(dir, "package.json");
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "lineoa-cs-mcp" && pkg.version) return pkg.version;
    }
    const up = dirname(dir);
    if (up === dir) return "0.0.0";
    dir = up;
  }
}

export const VERSION: string = readVersion();
