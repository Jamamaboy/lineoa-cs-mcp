import { describe, expect, it } from "vitest";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
import { withMockIfAsked } from "../../src/mock-env.js";

describe("withMockIfAsked", () => {
  it("leaves the settings alone without LINEOA_MOCK", async () => {
    const env = { LINEOA_BASE_URL: "https://chat.line.biz" };
    const r = await withMockIfAsked(env);
    expect(r.env).toBe(env);
    await r.close();
  });

  it("points everything at the mock with LINEOA_MOCK=1, so the CLI never reaches LINE", async () => {
    const r = await withMockIfAsked({ LINEOA_MOCK: "1", LINEOA_MOCK_PORT: "0" });
    try {
      expect(r.env.LINEOA_BASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(r.env.LINEOA_INDEX_FILE).toBe(":memory:");
      expect(r.env.LINEOA_AUDIT_FILE).toBe(":memory:");
      const bots = await createLineClient(loadConfig(r.env)).bots();
      expect(bots.map((b) => b.name)).toContain("Demo Shop");
    } finally {
      await r.close();
    }
  });
});
