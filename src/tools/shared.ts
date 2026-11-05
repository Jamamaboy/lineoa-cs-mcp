import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { LineOAClient } from "../client/line-client.js";
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

/** Uses the given OA, or the first one this staff member can reach. */
export async function resolveBotId(ctx: ToolContext, botId?: string): Promise<string> {
  if (botId) return botId;
  const bots = await ctx.client.bots();
  const first = bots[0];
  if (!first) throw new LineOAError("NOT_FOUND", "This staff account cannot reach any LINE OA.");
  return first.botId;
}
