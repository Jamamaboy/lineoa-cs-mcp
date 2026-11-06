import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root (the folder with our package.json), found from src/ or dist/src/ alike. */
function findRoot(): { dir: string; version: string } | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const file = join(dir, "package.json");
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "lineoa-cs-mcp") return { dir, version: pkg.version ?? "0.0.0" };
    }
    const up = dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

const root = findRoot();
/** One version source: package.json. */
export const VERSION: string = root?.version ?? "0.0.0";
/** Repo root, for files that live outside src/ (e.g. the mock's recorded fixtures). */
export const ROOT_DIR: string | undefined = root?.dir;
