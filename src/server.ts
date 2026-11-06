import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthStatus } from "./tools/auth-status.js";
import { registerGetAttachment } from "./tools/get-attachment.js";
import { registerGetUserProfile } from "./tools/get-user-profile.js";
import { registerListChats } from "./tools/list-chats.js";
import { registerReadChat } from "./tools/read-chat.js";
import { registerSearchMessages } from "./tools/search-messages.js";
import { registerSendMessage } from "./tools/send-message.js";
import type { ToolContext } from "./tools/shared.js";

export const SERVER_NAME = "lineoa-cs";
export const SERVER_VERSION = "0.1.3";

export function createServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerAuthStatus(server, ctx);
  registerListChats(server, ctx);
  registerReadChat(server, ctx);
  registerGetUserProfile(server, ctx);
  registerSearchMessages(server, ctx);
  registerGetAttachment(server, ctx);
  registerSendMessage(server, ctx); // only registers when LINEOA_ALLOW_SEND=true
  return server;
}
