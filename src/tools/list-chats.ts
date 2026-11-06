import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Chat } from "../domain/types.js";
import { oaInput, resolveBotId, run, type ToolContext } from "./shared.js";

/** How many chats one call may look through to fill a filtered list. */
const MAX_SCAN = 125;

export const chatFilters: Record<"all" | "unread" | "ongoing" | "needs_reply", (c: Chat) => boolean> = {
  all: () => true,
  unread: (c) => c.unread,
  ongoing: (c) => c.status === "ongoing",
  needs_reply: (c) => c.status === "ongoing" && c.lastMessage?.from === "customer",
};

export function registerListChats(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "list_chats",
    {
      title: "List chats",
      description:
        "Lists chats in a LINE OA, newest activity first. `ongoing` (default) = not marked done; `unread` = " +
        "has messages nobody opened yet; `needs_reply` = the customer sent the last message and nobody " +
        "answered yet (use it to find silent chats); `all` = everything. Each chat has a `webUrl` that opens it in " +
        "LINE OA Manager for a human. Reading never marks a chat as read. With a filter it looks through up to " +
        "125 chats; if `nextCursor` is present there may be more.",
      inputSchema: {
        filter: z.enum(["ongoing", "unread", "needs_reply", "all"]).default("ongoing"),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional().describe("`nextCursor` from the previous page"),
        oa: oaInput,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ filter, limit, cursor, oa }) =>
      run(async () => {
        const bot = await resolveBotId(ctx, oa);
        // The console's folder filters are unconfirmed (PLAN §6a), so chats are filtered here. A filter can
        // leave a page empty, so keep reading pages until `limit` chats match or MAX_SCAN chats were checked.
        const chats: Chat[] = [];
        let next = cursor;
        let scanned = 0;
        do {
          // Ask only for as many as are still missing, so no matched chat is ever cut off behind the cursor.
          const want = Math.min(25, limit - chats.length);
          const page = await ctx.client.listChats(bot, { limit: want, ...(next ? { cursor: next } : {}) });
          scanned += page.items.length;
          chats.push(...page.items.filter(chatFilters[filter]));
          next = page.cursor;
        } while (next && chats.length < limit && scanned < MAX_SCAN);
        return {
          botId: bot,
          filter,
          chats,
          scanned,
          ...(next ? { nextCursor: next } : {}),
        };
      }),
  );
}
