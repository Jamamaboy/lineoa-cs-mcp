#!/usr/bin/env node
import "./quiet.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuditLog } from "./audit/audit-log.js";
import { createLineClient } from "./client/line-client.js";
import { loadConfig } from "./config.js";
import { MessageStore } from "./index/store.js";
import { withMockIfAsked } from "./mock-env.js";
import { createServer } from "./server.js";

// LINEOA_MOCK=1 starts the mock inside this process, so trying the server takes one command.
const { env } = await withMockIfAsked({ ...process.env });

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
