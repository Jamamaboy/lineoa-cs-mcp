import { chmodSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";

export const DEFAULT_SESSION_FILE = "~/.config/lineoa-mcp/session.json";

export const expandHome = (p: string) => (p.startsWith("~/") ? homedir() + p.slice(1) : p);

export function sessionPath(env: NodeJS.ProcessEnv = process.env): string {
  return expandHome(env.LINEOA_SESSION_FILE ?? DEFAULT_SESSION_FILE);
}

/** Writes the session where only this OS user can read it (dir 0700, file 0600). */
export function writeSession(path: string, state: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // Write a private temp file, then rename: a crash never leaves a half-written or world-readable session.
  const tmp = `${path}.tmp`;
  try {
    rmSync(tmp, { force: true }); // a stale tmp may have wider permissions; "wx" needs it gone
    writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600, flag: "wx" });
    chmodSync(tmp, 0o600); // the umask can only narrow the mode, but be explicit
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}
