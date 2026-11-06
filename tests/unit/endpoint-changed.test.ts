import { describe, expect, it } from "vitest";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";

describe("a changed API shape", () => {
  it("becomes ENDPOINT_CHANGED instead of a crash", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ items: [] }), {
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const client = createLineClient(
      loadConfig({
        LINEOA_BASE_URL: "http://127.0.0.1:1",
        LINEOA_COOKIE: "s=1",
        LINEOA_SESSION_FILE: "/none",
      }),
      fakeFetch,
    );
    await expect(client.bots()).rejects.toMatchObject({ code: "ENDPOINT_CHANGED" });
  });
});
