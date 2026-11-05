import { describe, expect, it } from "vitest";
import { createMockApp, SESSION_COOKIE } from "../../mock-server/app.js";

const app = createMockApp({ devSession: "t" });
const auth = { headers: { Cookie: `${SESSION_COOKIE}=t` } };
const get = (path: string, init = auth) => app.request(path, init);

describe("mock chat.line.biz", () => {
  it("rejects calls without a session like the real console", async () => {
    const res = await get("/api/v1/me", { headers: { Cookie: "" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "not_login" });
  });

  it("lists bots and pages through chats with an opaque cursor", async () => {
    const bots = (await (await get("/api/v1/bots")).json()) as { list: { botId: string }[] };
    const botId = bots.list[0]?.botId;
    const p1 = (await (await get(`/api/v2/bots/${botId}/chats?limit=2`)).json()) as {
      list: unknown[];
      next?: string;
    };
    expect(p1.list).toHaveLength(2);
    expect(p1.next).toBeTypeOf("string");
    const p2 = (await (await get(`/api/v2/bots/${botId}/chats?limit=2&next=${p1.next}`)).json()) as {
      list: unknown[];
    };
    expect(p2.list.length).toBeGreaterThan(0);
  });

  it("returns history newest first with a backward cursor", async () => {
    const bots = (await (await get("/api/v1/bots")).json()) as { list: { botId: string }[] };
    const botId = bots.list[0]?.botId;
    const chats = (await (await get(`/api/v2/bots/${botId}/chats`)).json()) as { list: { chatId: string }[] };
    const chatId = chats.list.find((c) => c.chatId.startsWith("Uc5000000000000000000000000000001"))?.chatId;
    const res = (await (await get(`/api/v3/bots/${botId}/chats/${chatId}/messages?limit=10`)).json()) as {
      list: { timestamp: number }[];
      backward?: string;
    };
    expect(res.list).toHaveLength(10);
    expect(res.backward).toBeTypeOf("string");
    const ts = res.list.map((e) => e.timestamp);
    expect([...ts].sort((a, b) => b - a)).toEqual(ts);
  });

  it("logs in through the form and issues a session cookie", async () => {
    const res = await app.request("/mock/login", {
      method: "POST",
      body: new URLSearchParams({ email: "cs@example.com", password: "x" }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=`);
  });
});
