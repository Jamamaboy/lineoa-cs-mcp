import { readFileSync } from "node:fs";
import { DEFAULT_SESSION_FILE, expandHome } from "./auth/session-file.js";
import { LineOAError } from "./domain/errors.js";

export interface Config {
  /** chat.line.biz (real) or the mock's URL. */
  baseUrl: string;
  /** Where `webUrl` links point. Same as baseUrl unless set. */
  webBaseUrl: string;
  /** Cookie header to send. Comes from LINEOA_COOKIE or the session file. */
  cookie: () => string | undefined;
  botAllowlist: string[];
  allowSend: boolean;
}

/** Reads a Playwright storageState file and builds a Cookie header for the console host. */
export function cookieFromSessionFile(path: string, host: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(expandHome(path), "utf8");
  } catch {
    return undefined;
  }
  const state = JSON.parse(raw) as { cookies?: { name: string; value: string; domain: string }[] };
  const cookies = (state.cookies ?? []).filter((c) => host.endsWith(c.domain.replace(/^\./, "")));
  return cookies.length ? cookies.map((c) => `${c.name}=${c.value}`).join("; ") : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const baseUrl = (env.LINEOA_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    throw new LineOAError("CONFIG_ERROR", `LINEOA_BASE_URL is not a URL: ${baseUrl}`);
  }
  const sessionFile = env.LINEOA_SESSION_FILE ?? DEFAULT_SESSION_FILE;
  return {
    baseUrl,
    webBaseUrl: (env.LINEOA_WEB_BASE_URL ?? baseUrl).replace(/\/$/, ""),
    // Read on every request, so a fresh `npm run login` works without restarting the server.
    cookie: () => env.LINEOA_COOKIE || cookieFromSessionFile(sessionFile, host),
    botAllowlist: (env.LINEOA_BOT_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    allowSend: env.LINEOA_ALLOW_SEND === "true",
  };
}
