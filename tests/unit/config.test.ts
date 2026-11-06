import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("rejects a non-number safety limit instead of turning it off", () => {
    expect(() => loadConfig({ LINEOA_SEND_DAILY_LIMIT: "abc" })).toThrow(
      /LINEOA_SEND_DAILY_LIMIT must be a positive/,
    );
    expect(() => loadConfig({ LINEOA_MAX_ATTACHMENT_MB: "-1" })).toThrow(/positive whole number/);
  });
  it("uses defaults for empty values", () => {
    const c = loadConfig({ LINEOA_SEND_DAILY_LIMIT: "" });
    expect(c.sendDailyLimit).toBe(50);
    expect(c.maxAttachmentBytes).toBe(32 * 1024 * 1024);
  });
});
