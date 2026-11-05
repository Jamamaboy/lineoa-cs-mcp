import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { oaInput, resolveBotId, run, type ToolContext } from "./shared.js";

export function registerGetUserProfile(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_user_profile",
    {
      title: "Get a customer's profile",
      description:
        "Shows who a customer is: name, nickname, whether they are still a friend of the OA, the staff tags " +
        "on the chat, staff notes, who the chat is assigned to, and a `webUrl` to open the chat. In a 1:1 " +
        "chat the chatId is the customer's userId, so either works.",
      inputSchema: {
        chatId: z.string().describe("chatId (or userId) from list_chats"),
        oa: oaInput,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ chatId, oa }) => run(async () => ctx.client.getProfile(await resolveBotId(ctx, oa), chatId)),
  );
}
