import { DEFAULT_SESSION_FILE, expandHome } from "./auth/session-file.js";
import { envSource, fileSource, firstOf } from "./auth/session-source.js";
import { LineOAError } from "./domain/errors.js";

export interface Config {
  /** chat.line.biz (real) or the mock's URL. */
  baseUrl: string;
  /** Where `webUrl` links point. Same as baseUrl unless set. */
  webBaseUrl: string;
  /** Cookie header for a host (default: the console's). From LINEOA_COOKIE or the session file. */
  cookie: (host?: string) => string | undefined;
  /** Where attachment bytes live (chat-content.line.biz on the real console). */
  contentBaseUrl: string;
  /** Downloaded attachments go here. */
  cacheDir: string;
  maxAttachmentBytes: number;
  botAllowlist: string[];
  /** OA to use when a request names none and the account reaches several (name, @id or botId). */
  defaultOa?: string;
  allowSend: boolean;
  /** If set, sending is allowed only to these chat ids. */
  sendChatAllowlist: string[];
  sendDailyLimit: number;
  auditFile: string;
  /** Local search index (SQLite file, or ":memory:"). */
  indexFile: string;
  syncLimits: { maxChats: number; maxMessagesPerChat: number };
}

/** A positive whole number from the environment, or the default. Anything else is a config error, so a typo
 * can never switch a safety limit off (Number("abc") is NaN, and every comparison with NaN is false). */
function positiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0)
    throw new LineOAError("CONFIG_ERROR", `${name} must be a positive whole number, got "${raw}".`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // The real console by default; the mock is used only when asked for (LINEOA_MOCK=1 or a mock URL).
  const baseUrl = (env.LINEOA_BASE_URL ?? "https://chat.line.biz").replace(/\/$/, "");
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    throw new LineOAError("CONFIG_ERROR", `LINEOA_BASE_URL is not a URL: ${baseUrl}`);
  }
  const session = firstOf(
    envSource(env.LINEOA_COOKIE),
    fileSource(expandHome(env.LINEOA_SESSION_FILE ?? DEFAULT_SESSION_FILE)),
  );
  return {
    baseUrl,
    webBaseUrl: (env.LINEOA_WEB_BASE_URL ?? baseUrl).replace(/\/$/, ""),
    // Read on every request, so a fresh `npm run login` works without restarting the server.
    cookie: (h = host) => session.cookieFor(h),
    contentBaseUrl: (
      env.LINEOA_CONTENT_URL ??
      (host === "chat.line.biz" ? "https://chat-content.line.biz" : `${baseUrl}/content`)
    ).replace(/\/$/, ""),
    cacheDir: expandHome(env.LINEOA_CACHE_DIR ?? "~/.cache/lineoa-mcp/attachments"),
    maxAttachmentBytes: positiveInt(env, "LINEOA_MAX_ATTACHMENT_MB", 32) * 1024 * 1024,
    botAllowlist: (env.LINEOA_BOT_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ...(env.LINEOA_DEFAULT_OA ? { defaultOa: env.LINEOA_DEFAULT_OA } : {}),
    allowSend: env.LINEOA_ALLOW_SEND === "true",
    sendChatAllowlist: (env.LINEOA_SEND_CHAT_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    sendDailyLimit: positiveInt(env, "LINEOA_SEND_DAILY_LIMIT", 50),
    auditFile: expandHome(env.LINEOA_AUDIT_FILE ?? "~/.local/share/lineoa-mcp/audit.jsonl"),
    indexFile: expandHome(env.LINEOA_INDEX_FILE ?? "~/.local/share/lineoa-mcp/index.db"),
    syncLimits: {
      maxChats: positiveInt(env, "LINEOA_SYNC_MAX_CHATS", 50),
      maxMessagesPerChat: positiveInt(env, "LINEOA_SYNC_MAX_MESSAGES", 200),
    },
  };
}
