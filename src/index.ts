#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLineClient } from "./client/line-client.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

const config = loadConfig();
const server = createServer({ config, client: createLineClient(config) });
await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so logs go to stderr only.
console.error(`lineoa-cs MCP server ready (console: ${config.baseUrl})`);
