/**
 * `npm run try`: a 10-second tour without any AI client. Starts the server with the built-in mock,
 * connects as an MCP client over stdio (exactly how Claude launches it), and calls each tool.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "src/index.ts"],
  env: { ...(process.env as Record<string, string>), LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0" },
  stderr: "ignore",
});
const client = new Client({ name: "try", version: "0" });
await client.connect(transport);
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { text: string }[])[0]?.text ?? "";
  if (res.isError) throw new Error(text);
  return JSON.parse(text);
};

const tools = (await client.listTools()).tools.map((t) => t.name);
console.log(`\n▶ tools: ${tools.join(", ")}`);

const auth = await call("auth_status");
console.log(
  `\n▶ auth_status\n  staff: ${auth.staff}\n  OAs:   ${auth.oas.map((o: { name: string }) => o.name).join(" · ")}`,
);
console.log(`  sending enabled: ${auth.sendingEnabled}`);

const list = await call("list_chats", { filter: "all", limit: 10 });
console.log(`\n▶ list_chats (● = unread)`);
for (const c of list.chats) {
  console.log(
    `  ${c.unread ? "●" : " "} ${c.name.padEnd(24)} ${(c.lastMessage?.preview ?? "").slice(0, 44)}`,
  );
}

const target =
  list.chats.find((c: { name: string }) => c.name === "สมชาย ใจดี") ??
  list.chats.find((c: { kind: string }) => c.kind === "user");
const chat = await call("read_chat", { chatId: target.chatId, limit: 8 });
console.log(`\n▶ read_chat "${chat.chat.name}"\n  webUrl: ${chat.chat.webUrl}`);
for (const m of chat.messages) {
  const file = m.attachment ? `  📎 ${m.attachment.fileName ?? m.attachment.kind}` : "";
  console.log(`  ${m.from === "staff" ? "   CS →" : "ลูกค้า →"} ${(m.text ?? "").slice(0, 60)}${file}`);
}
console.log("\n  (run `npm run mock` and open http://127.0.0.1:8787 to browse the same chats)\n");
await client.close();
