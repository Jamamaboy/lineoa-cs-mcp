import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LineOAError } from "../domain/errors.js";
import { idInput, oaInput, resolveBotId, run, type ToolContext } from "./shared.js";

/**
 * The only tool that changes anything. It is registered only when LINEOA_ALLOW_SEND=true, so in the
 * default read-only setup the agent cannot even see it. Every attempt goes to the audit log.
 */
export function registerSendMessage(server: McpServer, ctx: ToolContext) {
  if (!ctx.config.allowSend) return;
  server.registerTool(
    "send_message",
    {
      title: "Send a message to a customer",
      description:
        "Sends a text message to a LINE chat as the logged-in staff member; the customer sees it at once. " +
        "Always show the human the exact text and get their OK first, or call with dryRun=true to preview. " +
        "If the result is SEND_UNCERTAIN, read the chat before trying again; never resend blindly.",
      inputSchema: {
        chatId: idInput,
        text: z.string().min(1).max(2000),
        oa: oaInput,
        dryRun: z
          .boolean()
          .default(false)
          .describe("Check everything and show what would be sent, without sending"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    ({ chatId, text, oa, dryRun }) =>
      run(async () => {
        const bot = await resolveBotId(ctx, oa);
        const log = (
          outcome: "sent" | "dry_run" | "refused" | "failed",
          extra: Record<string, string> = {},
        ) => ctx.audit.record({ botId: bot, chatId, dryRun, outcome, text, ...extra });
        const refuse = (reason: string) => {
          log("refused", { reason });
          return new LineOAError("SEND_DISABLED", reason);
        };
        const { sendChatAllowlist, sendDailyLimit } = ctx.config;
        if (sendChatAllowlist.length && !sendChatAllowlist.includes(chatId))
          throw refuse("This chat is not in LINEOA_SEND_CHAT_ALLOWLIST.");
        if (ctx.audit.sentToday() >= sendDailyLimit)
          throw refuse(
            `Daily send limit reached (${sendDailyLimit}). Raise LINEOA_SEND_DAILY_LIMIT if this is expected.`,
          );

        const chat = await ctx.client.getChat(bot, chatId); // also proves the chat exists
        if (dryRun) {
          log("dry_run");
          return { dryRun: true, wouldSendTo: chat.name, text, webUrl: chat.webUrl };
        }
        try {
          const sent = await ctx.client.sendText(bot, chatId, text);
          log("sent", { sendId: sent.sendId });
          return { sent: true, to: chat.name, ...sent, webUrl: chat.webUrl };
        } catch (err) {
          log("failed", { reason: err instanceof Error ? err.message : String(err) });
          throw err;
        }
      }),
  );
}
