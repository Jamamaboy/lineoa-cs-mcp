import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { loadSeed, type Seed } from "./fixtures.js";

/** Same cookie name as chat.line.biz. */
export const SESSION_COOKIE = "__Host-chat-ses";

export interface MockOptions {
  seed?: Seed;
  /** Extra session token that is always valid (handy for tests and local runs). */
  devSession?: string;
}

/** Opaque cursor: the mock encodes an offset; real cursors are opaque strings too. */
const encodeCursor = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");
function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const m = /^o:(\d+)$/.exec(Buffer.from(cursor, "base64url").toString());
  return m ? Number(m[1]) : 0;
}
function clampLimit(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 100) : fallback;
}

/**
 * A stand-in for chat.line.biz's internal JSON API. Paths, field names, the session cookie and the
 * 401 `not_login` body copy the real console (see test/research/line-api-shapes/README.md).
 */
export function createMockApp(opts: MockOptions = {}) {
  const seed = opts.seed ?? loadSeed();
  const sessions = new Set<string>(opts.devSession ? [opts.devSession] : []);
  const app = new Hono();

  // --- login (stands in for LINE Business ID; the CS person types anything) ---
  app.get("/mock/login", (c) =>
    c.html(`<!doctype html><meta charset="utf-8"><title>Mock LINE login</title>
<form method="post" action="/mock/login" style="font:16px system-ui;max-width:320px;margin:80px auto;display:grid;gap:10px">
<h1 style="font-size:20px">Mock LINE Business ID</h1>
<input name="email" placeholder="email" required><input name="password" type="password" placeholder="password" required>
<button>Log in</button></form>`),
  );
  app.post("/mock/login", async (c) => {
    const form = await c.req.parseBody();
    if (!form.email || !form.password) return c.text("missing email or password", 400);
    const token = randomBytes(18).toString("base64url");
    sessions.add(token);
    setCookie(c, SESSION_COOKIE, token, { path: "/", secure: true, httpOnly: true, sameSite: "Lax" });
    return c.redirect("/");
  });
  app.get("/", (c) => c.text("mock chat.line.biz — logged in"));

  // --- every /api route needs a session, like the real console ---
  app.use("/api/*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !sessions.has(token)) return c.json({ code: "not_login" }, 401);
    await next();
  });

  app.get("/api/v1/me", (c) => c.json(seed.me));
  app.get("/api/v1/bots", (c) => c.json({ userName: seed.me.name, list: seed.bots }));

  app.get("/api/v2/bots/:botId/chats", (c) => {
    const list = seed.chats.get(c.req.param("botId"));
    if (!list) return c.json({ code: "not_found" }, 404);
    const offset = decodeCursor(c.req.query("next"));
    const limit = clampLimit(c.req.query("limit"), 25);
    const page = list.slice(offset, offset + limit);
    const more = offset + limit < list.length;
    return c.json({ list: page, ...(more ? { next: encodeCursor(offset + limit) } : {}) });
  });

  app.get("/api/v1/bots/:botId/chats/:chatId", (c) => {
    const chat = seed.chats.get(c.req.param("botId"))?.find((x) => x.chatId === c.req.param("chatId"));
    return chat ? c.json(chat) : c.json({ code: "not_found" }, 404);
  });

  app.get("/api/v3/bots/:botId/chats/:chatId/messages", (c) => {
    const known = seed.chats.get(c.req.param("botId"))?.some((x) => x.chatId === c.req.param("chatId"));
    const events = seed.events.get(c.req.param("chatId"));
    if (!known || !events) return c.json({ code: "not_found" }, 404);
    const offset = decodeCursor(c.req.query("backward"));
    const limit = clampLimit(c.req.query("limit"), 50);
    const page = events.slice(offset, offset + limit);
    const more = offset + limit < events.length;
    return c.json({ list: page, ...(more ? { backward: encodeCursor(offset + limit) } : {}) });
  });

  return app;
}
