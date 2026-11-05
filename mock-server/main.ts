import { serve } from "@hono/node-server";
import { createMockApp, SESSION_COOKIE } from "./app.js";

const port = Number(process.env.MOCK_PORT ?? 8787);
const devSession = process.env.MOCK_DEV_SESSION ?? "mock-dev-session";

// 127.0.0.1 only: whatsapp-mcp's bridge listened on every interface with no auth; we don't repeat that.
serve({ fetch: createMockApp({ devSession }).fetch, hostname: "127.0.0.1", port }, (info) => {
  console.log(`mock chat.line.biz on http://127.0.0.1:${info.port}`);
  console.log(`dev session cookie: ${SESSION_COOKIE}=${devSession}`);
});
