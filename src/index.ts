#!/usr/bin/env node
import "./quiet.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuditLog } from "./audit/audit-log.js";
import { createLineClient } from "./client/line-client.js";
import { type Config, loadConfig } from "./config.js";
import { LineOAError } from "./domain/errors.js";
import { MessageStore } from "./index/store.js";
import { withMockIfAsked } from "./mock-env.js";
import { createServer } from "./server.js";

// LINEOA_MOCK=1 starts the mock inside this process, so trying the server takes one command.
// A bad setting is one stderr line and exit 1, not a stack trace the person cannot read.
let config: Config;
try {
  const { env } = await withMockIfAsked({ ...process.env });
  config = loadConfig(env);
} catch (err) {
  const code = err instanceof LineOAError ? `${err.code}: ` : "";
  console.error(`lineoa-cs: ${code}${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
const server = createServer({
  config,
  client: createLineClient(config),
  store: new MessageStore(config.indexFile),
  audit: new AuditLog(config.auditFile),
});
await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so logs go to stderr only.
console.error(`lineoa-cs MCP server ready (console: ${config.baseUrl})`);
