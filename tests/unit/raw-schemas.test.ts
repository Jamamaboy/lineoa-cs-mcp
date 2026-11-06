import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
import { checkList, checkOne, RawChatSchema, RawEventSchema } from "../../src/domain/raw-schemas.js";

const body = (name: string) =>
  JSON.parse(readFileSync(`test/research/line-api-shapes/${name}.json`, "utf8")).response.body;

describe("raw schemas", () => {
  it("chat and message fixtures pass", () => {
    const chats = body("chats").list;
    expect(checkList(chats, RawChatSchema, "chats", ["read", "done"])).toHaveLength(chats.length);
    expect(() => checkOne(body("chat"), RawChatSchema, "chat")).not.toThrow();
    for (const f of ["messages", "messages.older-page"]) {
      const list = body(f).list;
      expect(checkList(list, RawEventSchema, "messages")).toHaveLength(list.length);
    }
  });

  it("read missing on every chat is ENDPOINT_CHANGED", () => {
    const chats = body("chats").list.map(({ read: _r, ...c }: Record<string, unknown>) => c);
    expect(() => checkList(chats, RawChatSchema, "chats", ["read", "done"])).toThrowError(
      expect.objectContaining({ code: "ENDPOINT_CHANGED", message: expect.stringContaining("read") }),
    );
  });

  it("numeric chatId everywhere is ENDPOINT_CHANGED", () => {
    const chats = body("chats").list.map((c: Record<string, unknown>, i: number) => ({ ...c, chatId: i }));
    expect(() => checkList(chats, RawChatSchema, "chats", ["read", "done"])).toThrowError(
      expect.objectContaining({ code: "ENDPOINT_CHANGED", message: expect.stringContaining("chatId") }),
    );
  });

  it("one odd chat (nulls, group, no timestamp) is skipped, list still works", () => {
    const odd = [
      { chatId: "C1", read: null, done: null, latestEvent: null },
      {
        chatId: "C2",
        read: true,
        done: false,
        latestEvent: { type: "message", message: { id: "1", type: "text" } },
      },
      { chatId: "C3", read: false, done: false, chatType: "GROUP", profile: { name: "g", groupId: "G1" } },
      { read: true, done: false },
    ];
    const warn = console.error;
    console.error = () => {};
    try {
      expect(
        checkList(odd, RawChatSchema, "chats", ["read", "done"]).map((c) => (c as { chatId: string }).chatId),
      ).toEqual(["C1", "C2", "C3"]);
    } finally {
      console.error = warn;
    }
  });

  it("extra fields pass", () => {
    const c = { chatId: "C1", read: true, done: false, brandNew: { x: 1 }, profile: { name: "a", extra: 1 } };
    expect(checkOne(c, RawChatSchema, "chat")).toBe(c);
  });

  it("listChats with every chat missing read rejects with ENDPOINT_CHANGED", async () => {
    const chats = body("chats").list.map(({ read: _r, ...c }: Record<string, unknown>) => c);
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ list: chats }), {
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const client = createLineClient(
      loadConfig({
        LINEOA_BASE_URL: "https://chat.line.biz",
        LINEOA_COOKIE: "x=y",
        LINEOA_SESSION_FILE: "/none",
      }),
      fakeFetch,
    );
    await expect(client.listChats("Ub0700000000000000000000000000001", { limit: 5 })).rejects.toMatchObject({
      code: "ENDPOINT_CHANGED",
    });
  });
});
