import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMockApp, SESSION_COOKIE } from "../../mock-server/app.js";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
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
    ...env,
  });
  const server = createServer({ config, client: createLineClient(config) });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "e2e", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = (res.content as { type: string; text: string }[])[0]?.text ?? "";
    return { isError: Boolean(res.isError), text, json: res.isError ? undefined : JSON.parse(text) };
  };
  const stop = async () => {
    await client.close();
    await new Promise((r) => http.close(r));
  };
  return { client, call, stop, port };
}
