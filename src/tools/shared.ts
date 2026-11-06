import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { AuditLog } from "../audit/audit-log.js";
import { chooseOa } from "../client/choose-oa.js";
import { type LineOAClient, SAFE_ID } from "../client/line-client.js";
import type { Config } from "../config.js";
import { LineOAError } from "../domain/errors.js";
import type { MessageStore } from "../index/store.js";

export interface ToolContext {
  client: LineOAClient;
  config: Config;
  store: MessageStore;
  audit: AuditLog;
}

export function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Errors go back to the agent as text it can act on, never as a crash. */
export function fail(err: unknown): CallToolResult {
  if (err instanceof LineOAError) {
    const retry = err.retryAfterSec ? ` (retry after ${err.retryAfterSec}s)` : "";
    return { isError: true, content: [{ type: "text", text: `${err.code}: ${err.message}${retry}` }] };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text", text: `UNEXPECTED: ${msg}` }] };
}

export async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err);
  }
}

/** Resolves `oa` (name, @id or botId) to a botId. Several OAs and no name → CHOOSE_OA, so the agent asks. */
export async function resolveBotId(ctx: ToolContext, oa?: string): Promise<string> {
  return chooseOa(await ctx.client.bots(), oa, ctx.config.defaultOa).botId;
}

/** Chat and message ids: plain id characters only, so they can't rewrite the request path. */
export const idInput = z.string().regex(SAFE_ID, "not a LINE id");

/** The shared `oa` input every tool takes. */
export const oaInput = z
  .string()
  .optional()
  .describe(
    "Which LINE OA: its name, @id or botId (see auth_status). Leave empty only if the account has one OA",
  );
