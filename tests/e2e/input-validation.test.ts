import { describe, expect, it } from "vitest";
import { startStack } from "./helpers.js";

const SHOP_CHAT = "Uc5000000000000000000000000000001";

describe("input validation", () => {
  it("rejects impossible dates", async () => {
    const s = await startStack();
    for (const since of ["2026-02-30", "2026-13-45"]) {
      const r = await s.call("search_messages", { query: "a", since, refresh: false });
      expect(r.isError).toBe(true);
      expect(r.text).toContain("not a real date");
    }
    await s.stop();
  });

  it("accepts leap day 2028-02-29", async () => {
    const s = await startStack();
    const r = await s.call("search_messages", { query: "a", since: "2028-02-29", refresh: false });
    expect(r.isError).toBe(false);
    await s.stop();
  });

  it("rejects until before since", async () => {
    const s = await startStack();
    const r = await s.call("search_messages", {
      query: "a",
      since: "2026-11-05",
      until: "2026-11-01",
      refresh: false,
    });
    expect(r.text).toMatch(/^BAD_INPUT: until \(2026-11-01\) is before since \(2026-11-05\)/);
    await s.stop();
  });

  it("same-day since/until works", async () => {
    const s = await startStack();
    const r = await s.call("search_messages", {
      query: "a",
      since: "2026-11-05",
      until: "2026-11-05",
      refresh: false,
    });
    expect(r.isError).toBe(false);
    await s.stop();
  });

  it("rejects whitespace-only query", async () => {
    const s = await startStack();
    const r = await s.call("search_messages", { query: "   ", refresh: false });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("query is empty");
    await s.stop();
  });

  it("rejects whitespace-only send text", async () => {
    const s = await startStack({ LINEOA_ALLOW_SEND: "true" });
    const r = await s.call("send_message", { chatId: SHOP_CHAT, text: "   ", dryRun: true });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("text is only spaces");
    await s.stop();
  });

  it("external attachment failure is UPSTREAM_ERROR", async () => {
    const s = await startStack();
    const r = await s.call("get_attachment", { chatId: SHOP_CHAT, messageId: "586900000000000113" });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/^UPSTREAM_ERROR:/);
    expect(r.text).toContain("webUrl");
    expect(r.text).not.toContain("UNEXPECTED");
    await s.stop();
  });
});
