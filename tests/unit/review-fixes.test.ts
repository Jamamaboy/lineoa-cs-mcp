import { describe, expect, it } from "vitest";
import { winQuote } from "../../src/cli/setup.js";
import { getBytes } from "../../src/client/http.js";
import { LineOAError } from "../../src/domain/errors.js";
import { withMockIfAsked } from "../../src/mock-env.js";

// Follow-ups from the code, security and UX review of the review-fixes plan.
const deps = (fetchImpl: typeof fetch) => ({
  baseUrl: "https://chat.example.test",
  cookie: () => "S=1",
  fetch: fetchImpl,
});

describe("review follow-ups", () => {
  it("a download cut off after the headers is UPSTREAM_ERROR with the host only", async () => {
    const body = new ReadableStream({
      pull(c) {
        c.error(new TypeError("terminated"));
      },
    });
    const f = (async () => new Response(body, { status: 200 })) as typeof fetch;
    const err = await getBytes(deps(f), "https://files.example.org/a.jpg?sig=secret", 1000).catch((e) => e);
    expect(err).toBeInstanceOf(LineOAError);
    expect(err.code).toBe("UPSTREAM_ERROR");
    expect(err.message).toContain("files.example.org");
    expect(err.message).not.toContain("secret");
  });

  it("plain http on a line.biz host never gets the cookie", async () => {
    let sent: RequestInit["headers"] | undefined;
    const f = (async (_u: unknown, init?: RequestInit) => {
      sent = init?.headers;
      return new Response("x", { status: 200 });
    }) as typeof fetch;
    await getBytes(deps(f), "http://chat-content.line.biz/x", 1000);
    expect(JSON.stringify(sent ?? {})).not.toContain("S=1");
  });

  it("winQuote quotes spaces and refuses cmd metacharacters", () => {
    expect(winQuote("C:\\Users\\Jane Doe\\x")).toBe('"C:\\Users\\Jane Doe\\x"');
    expect(winQuote("plain")).toBe("plain");
    expect(() => winQuote("a&b")).toThrow();
  });

  it("the mock always keeps index and audit in memory", async () => {
    const r = await withMockIfAsked({
      LINEOA_MOCK: "1",
      LINEOA_MOCK_PORT: "0",
      LINEOA_AUDIT_FILE: "/tmp/real-audit.jsonl",
    });
    try {
      expect(r.env.LINEOA_AUDIT_FILE).toBe(":memory:");
      expect(r.env.LINEOA_INDEX_FILE).toBe(":memory:");
    } finally {
      await r.close();
    }
  });
});
