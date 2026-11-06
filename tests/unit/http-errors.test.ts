import { describe, expect, it } from "vitest";
import { getBytes, getJson, postJson } from "../../src/client/http.js";
import { createLineClient } from "../../src/client/line-client.js";
import { loadConfig } from "../../src/config.js";
import { LineOAError } from "../../src/domain/errors.js";

const baseUrl = "https://chat.example.test";
const deps = (fetchImpl: typeof fetch) => ({ baseUrl, cookie: () => "S=1", fetch: fetchImpl });
const down = (async () => {
  throw new TypeError("fetch failed");
}) as typeof fetch;

/** Runs `p` and returns what it threw (fails if it did not throw). */
async function thrown(p: Promise<unknown>): Promise<LineOAError> {
  try {
    await p;
  } catch (e) {
    return e as LineOAError;
  }
  throw new Error("expected a rejection");
}

describe("http errors", () => {
  it("404 message has no internal path", async () => {
    const f = (async () => new Response("", { status: 404 })) as typeof fetch;
    const err = await thrown(getJson(deps(f), "/api/v3/bots/Bsecret/chats/Usecret"));
    expect(err).toBeInstanceOf(LineOAError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).not.toContain("/api");
    expect(err.message).not.toContain("Usecret");
  });

  it("network error on GET becomes UPSTREAM_ERROR", async () => {
    const err = await thrown(getJson(deps(down), "/api/v1/x"));
    expect(err).toBeInstanceOf(LineOAError);
    expect(err.code).toBe("UPSTREAM_ERROR");
    expect(err.message).toContain("network error");
  });

  it("external download network error names only the host", async () => {
    const err = await thrown(getBytes(deps(down), "https://files.example.invalid/a/b.jpg?sig=abc", 1000));
    expect(err.code).toBe("UPSTREAM_ERROR");
    expect(err.message).toContain("files.example.invalid");
    expect(err.message).not.toContain("http");
    expect(err.message).not.toContain("?");
    expect(err.message).not.toContain("sig=");
  });

  it("external download sends no Cookie", async () => {
    let init: RequestInit | undefined;
    const f = (async (_u: unknown, i?: RequestInit) => {
      init = i;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as typeof fetch;
    const r = await getBytes(deps(f), "https://files.example.invalid/a.jpg", 1000);
    expect(r.bytes).toHaveLength(3);
    expect(JSON.stringify(init?.headers ?? {})).not.toMatch(/cookie/i);
  });

  it("postJson network error is not wrapped", async () => {
    const err = await postJson(deps(down), "/api/v1/send", {}, "tok").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(err).not.toBeInstanceOf(LineOAError);
  });

  it("csrf token fetch failure never reaches postJson", async () => {
    const calls: string[] = [];
    const f = (async (u: URL | string, i?: RequestInit) => {
      calls.push(`${i?.method ?? "GET"} ${new URL(u).pathname}`);
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const cfg = loadConfig({
      LINEOA_BASE_URL: baseUrl,
      LINEOA_COOKIE: "S=1",
      LINEOA_SESSION_FILE: "/nonexistent",
    });
    const client = createLineClient(cfg, f);
    const err = await thrown(client.sendText("Bbot", "Uchat", "hi"));
    expect(err).toBeInstanceOf(LineOAError);
    expect(err.code).toBe("UPSTREAM_ERROR");
    expect(calls.some((c) => c.startsWith("POST"))).toBe(false);
  });
});
