import { describe, expect, it } from "vitest";
import { hostMatches } from "../../src/auth/session-source.js";

describe("hostMatches", () => {
  it("matches the domain and its subdomains only", () => {
    expect(hostMatches("chat.line.biz", ".line.biz")).toBe(true);
    expect(hostMatches("line.biz", "line.biz")).toBe(true);
    expect(hostMatches("chat-content.line.biz", "line.biz")).toBe(true);
    expect(hostMatches("evilline.biz", "line.biz")).toBe(false);
    expect(hostMatches("line.biz.evil.com", "line.biz")).toBe(false);
  });
});
