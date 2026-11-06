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
    expect(tools.map((t) => t.name).sort()).toEqual([
      "auth_status",
      "get_attachment",
      "get_user_profile",
      "list_chats",
      "read_chat",
      "search_messages",
    ]);
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

  it("list_chats needs_reply keeps only chats where the customer spoke last", async () => {
    const r = await stack.call("list_chats", { filter: "needs_reply", limit: 50 });
    expect(r.json.chats.length).toBeGreaterThan(0);
    for (const c of r.json.chats) expect(c.lastMessage.from).toBe("customer");
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

  it("get_user_profile names the tags, notes and assignee", async () => {
    const list = await stack.call("list_chats", { filter: "all", limit: 50 });
    const somchai = list.json.chats.find((c: { name: string }) => c.name === "สมชาย ใจดี");
    const r = await stack.call("get_user_profile", { chatId: somchai.chatId });
    expect(r.json.tags).toEqual(["ลูกค้า VIP"]);
    expect(r.json.assignee).toBe("ปุ้ย ฝ่ายบริการลูกค้า");
    expect(r.json.notes).toHaveLength(2);
    expect(r.json.webUrl).toBe(somchai.webUrl);
  });

  it("search_messages finds Thai text inside words, with context and a webUrl", async () => {
    const r = await stack.call("search_messages", { query: "สลิป" });
    expect(r.json.hits.length).toBeGreaterThan(0);
    const hit = r.json.hits[0];
    expect(hit.text).toContain("สลิป");
    expect(hit.webUrl).toContain(hit.chatId);
    expect(r.json.indexRefresh.chatsUpdated).toBeGreaterThan(0);
    const again = await stack.call("search_messages", { query: "สลิป" });
    expect(again.json.indexRefresh.chatsUpdated).toBe(0);
    const staffOnly = await stack.call("search_messages", { query: "สลิป", from: "staff", refresh: false });
    for (const h of staffOnly.json.hits) expect(h.from).toBe("staff");
  });

  it("get_attachment shows a slip photo to the model and saves a PDF", async () => {
    const list = await stack.call("list_chats", { filter: "all", limit: 50 });
    const chatId = list.json.chats.find((c: { name: string }) => c.name === "สมชาย ใจดี").chatId;
    const slip = await stack.call("get_attachment", { chatId, messageId: "586900000000000106" });
    const image = slip.content.find((c) => c.type === "image");
    expect(image?.mimeType).toBe("image/jpeg");
    expect(slip.json.shownAs).toMatch(/^\d+x1568 jpeg$/);
    const pdf = await stack.call("get_attachment", { chatId, messageId: "586900000000000114" });
    expect(pdf.json.mime).toBe("application/pdf");
    expect(pdf.json.savedPath).toMatch(/\.pdf$/);
    expect(pdf.content.some((c) => c.type === "image")).toBe(false);
    const text = await stack.call("get_attachment", { chatId, messageId: "586900000000000104" });
    expect(text.isError).toBe(true);
  });

  it("asks which OA when several are reachable and none was named", async () => {
    const s = await startStack({ LINEOA_DEFAULT_OA: "" });
    const r = await s.call("list_chats");
    expect(r.text).toMatch(/^CHOOSE_OA: This account can reach 2 OAs: "Demo Shop".*Ask the person/);
    const named = await s.call("list_chats", { oa: "Demo Shop", filter: "all" });
    expect(named.json.chats.length).toBeGreaterThan(0);
    const empty = await s.call("list_chats", { oa: "@test-shop2", filter: "all" });
    expect(empty.json.chats).toHaveLength(0);
    await s.stop();
  });

  it("refuses ids that would rewrite the request path", async () => {
    for (const chatId of ["../../Ub0700000000000000000000000000002/chats/x", "abc?x=1", "a/b"]) {
      const r = await stack.call("read_chat", { chatId });
      expect(r.isError).toBe(true);
    }
  });

  it("turns a missing session into AUTH_EXPIRED with the fix in the message", async () => {
    const bad = await startStack({ LINEOA_COOKIE: "__Host-chat-ses=wrong" });
    const r = await bad.call("list_chats");
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/^AUTH_EXPIRED: .*npm run login/);
    await bad.stop();
  });
});
