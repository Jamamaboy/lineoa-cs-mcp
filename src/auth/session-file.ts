import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
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
  writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600); // in case the file already existed with wider permissions
}
