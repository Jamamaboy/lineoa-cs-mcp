/**
 * `npm run try`: a 10-second tour without any AI client. Connects as an MCP client over stdio
 * (exactly how Claude launches the server) and calls each tool.
 *   npm run try            → the built-in mock
 *   npm run try -- --real  → the live OA from `npm run login`, read-only: it never opens an unread chat
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const REAL = process.argv.includes("--real");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "src/index.ts"],
  env: {
    ...(process.env as Record<string, string>),
    LINEOA_ALLOW_SEND: "false",
    ...(REAL ? {} : { LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0" }),
  },
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

const oa = auth.oas[0]?.name; // the tour uses the first OA; an agent would ask which one
const list = await call("list_chats", { oa, filter: "all", limit: 10 });
console.log(`\n▶ list_chats (● = unread)`);
for (const c of list.chats) {
  console.log(
    `  ${c.unread ? "●" : " "} ${c.name.padEnd(24)} ${(c.lastMessage?.preview ?? "").slice(0, 44)}`,
  );
}

// Opening an unread chat on the live OA could change what staff see, so only read chats are opened.
const target = REAL
  ? list.chats.find((c: { kind: string; unread: boolean }) => c.kind === "user" && !c.unread)
  : (list.chats.find((c: { name: string }) => c.name === "สมชาย ใจดี") ??
    list.chats.find((c: { kind: string }) => c.kind === "user"));
if (!target) {
  console.log("\n(no already-read 1:1 chat on this page, so read_chat was skipped)\n");
  await client.close();
  process.exit(0);
}
const chat = await call("read_chat", { oa, chatId: target.chatId, limit: 8 });
console.log(`\n▶ read_chat "${chat.chat.name}"\n  webUrl: ${chat.chat.webUrl}`);
for (const m of chat.messages) {
  const file = m.attachment ? `  📎 ${m.attachment.fileName ?? m.attachment.kind}` : "";
  console.log(`  ${m.from === "staff" ? "   CS →" : "ลูกค้า →"} ${(m.text ?? "").slice(0, 60)}${file}`);
}
console.log(
  REAL
    ? "\n  (live OA, read-only: nothing was sent and no unread chat was opened)\n"
    : "\n  (run `npm run mock` and open http://127.0.0.1:8787 to browse the same chats)\n",
);
await client.close();
