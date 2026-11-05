import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startStack } from "./helpers.js";

let stack: Awaited<ReturnType<typeof startStack>>;
beforeAll(async () => {
  stack = await startStack();
});
afterAll(async () => stack.stop());

describe("MCP read core against the mock", () => {
  it("exposes the read tools, all marked read-only", async () => {
    const { tools } = await stack.client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["auth_status", "list_chats", "read_chat"]);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("auth_status shows the staff member and their OAs", async () => {
    const r = await stack.call("auth_status");
    expect(r.isError).toBe(false);
    expect(r.json.loggedIn).toBe(true);
    expect(r.json.oas.length).toBe(2);
    expect(r.json.sendingEnabled).toBe(false);
  });

  it("list_chats returns ongoing chats with a webUrl and a next cursor", async () => {
    const r = await stack.call("list_chats", { filter: "all", limit: 3 });
    expect(r.json.chats).toHaveLength(3);
    expect(r.json.nextCursor).toBeTypeOf("string");
    const c = r.json.chats[0];
    expect(c.webUrl).toBe(`http://127.0.0.1:${stack.port}/${c.botId}/chat/${c.chatId}`);
    const next = await stack.call("list_chats", { filter: "all", limit: 3, cursor: r.json.nextCursor });
    expect(next.json.chats.length).toBeGreaterThan(0);
  });

  it("read_chat returns messages oldest to newest with attachment metadata and older pages", async () => {
    const list = await stack.call("list_chats", { filter: "all", limit: 50 });
    const somchai = list.json.chats.find((c: { name: string }) => c.name === "สมชาย ใจดี");
    const r = await stack.call("read_chat", { chatId: somchai.chatId, limit: 10 });
    const times = r.json.messages.map((m: { sentAt: string }) => m.sentAt);
    expect([...times].sort()).toEqual(times);
    expect(r.json.messages.some((m: { attachment?: unknown }) => m.attachment)).toBe(true);
    expect(r.json.messages.every((m: { from: string }) => m.from !== "system")).toBe(true);
    expect(r.json.prevCursor).toBeTypeOf("string");
    const older = await stack.call("read_chat", { chatId: somchai.chatId, cursor: r.json.prevCursor });
    expect(older.json.messages.length).toBeGreaterThan(0);
  });

  it("turns a missing session into AUTH_EXPIRED with the fix in the message", async () => {
    const bad = await startStack({ LINEOA_COOKIE: "__Host-chat-ses=wrong" });
    const r = await bad.call("list_chats");
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/^AUTH_EXPIRED: .*npm run login/);
    await bad.stop();
  });
});
