import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { run, type ToolContext } from "./shared.js";

export function registerAuthStatus(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "auth_status",
    {
      title: "Check the LINE OA session",
      description:
        "Checks that the CS person's LINE OA Manager session works, and lists the OAs (bots) it can reach. " +
        "Call it before a long run. If it fails with AUTH_EXPIRED, ask the human to run `npm run login`.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () =>
      run(async () => {
        const [me, bots] = await Promise.all([ctx.client.me(), ctx.client.bots()]);
        return {
          loggedIn: true,
          staff: me.staffName,
          console: new URL(ctx.config.baseUrl).host,
          oas: bots,
          sendingEnabled: ctx.config.allowSend,
        };
      }),
  );
}
