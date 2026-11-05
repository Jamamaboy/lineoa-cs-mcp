#!/usr/bin/env node
import "./quiet.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuditLog } from "./audit/audit-log.js";
import { createLineClient } from "./client/line-client.js";
import { loadConfig } from "./config.js";
import { MessageStore } from "./index/store.js";
import { createServer } from "./server.js";

// LINEOA_MOCK=1 starts the mock inside this process, so trying the server takes one command.
const env = { ...process.env };
if (env.LINEOA_MOCK === "1") {
  const { startMock } = await import("../mock-server/start.js");
  const mock = await startMock(Number(env.LINEOA_MOCK_PORT ?? 8787));
  env.LINEOA_BASE_URL = mock.baseUrl;
  env.LINEOA_COOKIE = mock.cookie;
  env.LINEOA_INDEX_FILE ??= ":memory:"; // never mix mock chats into the real index or audit log
  env.LINEOA_AUDIT_FILE ??= ":memory:";
  console.error(`mock chat.line.biz running at ${mock.baseUrl} (open it in a browser to see the chats)`);
}

const config = loadConfig(env);
const server = createServer({
  config,
  client: createLineClient(config),
  store: new MessageStore(config.indexFile),
  audit: new AuditLog(config.auditFile),
});
await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so logs go to stderr only.
console.error(`lineoa-cs MCP server ready (console: ${config.baseUrl})`);
