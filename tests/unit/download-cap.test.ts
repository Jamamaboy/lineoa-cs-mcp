import { describe, expect, it } from "vitest";
import { getBytes } from "../../src/client/http.js";

describe("getBytes", () => {
  it("stops a download without a length once it passes the cap", async () => {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(ctrl) {
        sent += 1024;
        ctrl.enqueue(new Uint8Array(1024));
        if (sent > 1024 * 1024) ctrl.close();
      },
    });
    const fakeFetch = (async () => new Response(body)) as typeof fetch;
    const deps = { baseUrl: "http://127.0.0.1:1", cookie: () => "s=1", fetch: fakeFetch };
    await expect(getBytes(deps, "http://127.0.0.1:1/file", 10 * 1024)).rejects.toMatchObject({
      code: "ATTACHMENT_TOO_LARGE",
    });
    expect(sent).toBeLessThan(64 * 1024); // it did not read the whole megabyte first
  });
});
