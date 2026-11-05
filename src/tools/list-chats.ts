import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveBotId, run, type ToolContext } from "./shared.js";

export function registerListChats(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "list_chats",
    {
      title: "List chats",
      description:
        "Lists chats in a LINE OA, newest activity first. `ongoing` (default) = not marked done; `unread` = " +
        "has messages nobody opened yet; `needs_reply` = the customer sent the last message and nobody " +
        "answered yet (use it to find silent chats); `all` = everything. Each chat has a `webUrl` that opens it in " +
        "LINE OA Manager for a human. Reading never marks a chat as read.",
      inputSchema: {
        filter: z.enum(["ongoing", "unread", "needs_reply", "all"]).default("ongoing"),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional().describe("`nextCursor` from the previous page"),
        botId: z.string().optional().describe("OA id from auth_status; default is the first OA"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ filter, limit, cursor, botId }) =>
      run(async () => {
        const bot = await resolveBotId(ctx, botId);
        const page = await ctx.client.listChats(bot, { limit, ...(cursor ? { cursor } : {}) });
        // The console's folder filters are unconfirmed (PLAN §6a), so we filter this page ourselves.
        const keep: Record<typeof filter, (c: (typeof page.items)[number]) => boolean> = {
          all: () => true,
          unread: (c) => c.unread,
          ongoing: (c) => c.status === "ongoing",
          needs_reply: (c) => c.status === "ongoing" && c.lastMessage?.from === "customer",
        };
        const chats = page.items.filter(keep[filter]);
        return { botId: bot, filter, chats, ...(page.cursor ? { nextCursor: page.cursor } : {}) };
      }),
  );
}
