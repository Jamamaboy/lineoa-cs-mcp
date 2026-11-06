import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type RawChat, type RawEvent, toChat, toMessage } from "../../src/domain/normalize.js";

const body = (name: string) =>
  JSON.parse(readFileSync(`test/research/line-api-shapes/${name}.json`, "utf8")).response.body;

describe("normalize", () => {
  it("toChat unread/status from fixture", () => {
    const chats: RawChat[] = body("chats").list;
    const out = chats.map((c) => toChat(c, "B1", "http://web"));
    expect(out.map((c) => c.unread)).toEqual(chats.map((c) => c.read === false));
    expect(out.map((c) => c.status)).toEqual(chats.map((c) => (c.done ? "done" : "ongoing")));
    expect(out.some((c) => c.unread)).toBe(true);
    expect(out[0]?.webUrl).toBe(`http://web/B1/chat/${chats[0]?.chatId}`);
  });

  it("toMessage attachment and expired", () => {
    const events: RawEvent[] = [...body("messages").list, ...body("messages.older-page").list];
    const msgs = events.map(toMessage);
    const image = msgs.find((m) => m?.id === "586900000000000106");
    expect(image?.attachment).toMatchObject({ kind: "image", provider: "line", expired: false });
    const file = msgs.find((m) => m?.id === "586900000000000114");
    expect(file?.attachment).toMatchObject({
      kind: "file",
      provider: "line",
      fileName: expect.any(String),
      sizeBytes: 48213,
    });
    expect(file?.text).toContain("[file]");
    const expired = msgs.find((m) => m?.id === "586900000000000104");
    expect(expired?.attachment?.expired).toBe(true);
    expect(expired?.attachment?.expiresAt).toBeTypeOf("string");
  });
});
