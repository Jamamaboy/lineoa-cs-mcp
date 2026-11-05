import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMockApp, SESSION_COOKIE } from "../../mock-server/app.js";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
import { MessageStore } from "../../src/index/store.js";
import { createServer } from "../../src/server.js";

/** Starts the mock on a random port and connects a real MCP client to our server over memory. */
export async function startStack(env: Record<string, string> = {}) {
  const http = serve({ fetch: createMockApp({ devSession: "e2e" }).fetch, hostname: "127.0.0.1", port: 0 });
  await new Promise((r) => http.once("listening", r));
  const { port } = http.address() as AddressInfo;
  const config = loadConfig({
    LINEOA_BASE_URL: `http://127.0.0.1:${port}`,
    LINEOA_COOKIE: `${SESSION_COOKIE}=e2e`,
    LINEOA_SESSION_FILE: "/nonexistent",
    LINEOA_INDEX_FILE: ":memory:",
    LINEOA_CACHE_DIR: mkdtempSync(join(tmpdir(), "lineoa-cache-")),
    ...env,
  });
  const server = createServer({
    config,
    client: createLineClient(config),
    store: new MessageStore(":memory:"),
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "e2e", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as { type: string; text?: string; data?: string; mimeType?: string }[];
    const textPart = content.find((c) => c.type === "text")?.text ?? "";
    const parsed = res.isError ? undefined : JSON.parse(textPart);
    return { isError: Boolean(res.isError), text: textPart, json: parsed, content };
  };
  const stop = async () => {
    await client.close();
    await new Promise((r) => http.close(r));
  };
  return { client, call, stop, port };
}
