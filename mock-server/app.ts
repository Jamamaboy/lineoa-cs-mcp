import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import sharp from "sharp";
import { loadSeed, type Seed } from "./fixtures.js";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch,
  );

/** Stand-in bytes for each fixture's contentHash: a real PNG for images, real headers for the rest. */
async function fakeContent(hash: string): Promise<{ body: Uint8Array; type: string }> {
  if (hash.includes("pdf")) {
    return { body: new TextEncoder().encode("%PDF-1.4\n% mock receipt\n%%EOF\n"), type: "application/pdf" };
  }
  if (hash.includes("xlsx")) {
    return {
      body: new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(60).fill(0)]),
      type: "application/zip",
    };
  }
  if (hash.includes("video") || hash.includes("voice")) {
    const head = [0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]; // ....ftypmp42
    return { body: new Uint8Array([...head, ...new Array(500).fill(0)]), type: "video/mp4" };
  }
  // A tall "slip" photo, bigger than the model needs, so the resize path is exercised.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800">
<rect width="100%" height="100%" fill="#f4f4f5"/><rect x="80" y="80" width="1040" height="220" fill="#06c755"/>
<text x="120" y="230" font-size="110" font-family="sans-serif" fill="#fff">MOCK SLIP</text>
<text x="120" y="600" font-size="90" font-family="sans-serif" fill="#111">Amount 1,250.00 THB</text>
<text x="120" y="760" font-size="60" font-family="sans-serif" fill="#555">ref ${hash.replace(/[^\w-]/g, "")}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { body: new Uint8Array(png), type: "image/png" };
}

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
  // --- tiny console: the page a `webUrl` opens, so a human can see what the agent sees ---
  const page = (title: string, body: string) =>
    `<!doctype html><html lang="th"><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:14px system-ui,sans-serif;margin:0;background:#f5f6f8;color:#111}
header{background:#06c755;color:#fff;padding:10px 16px;font-weight:600}main{max-width:760px;margin:16px auto;padding:0 12px}
a{color:#0b6} .row{background:#fff;border-radius:10px;padding:10px 12px;margin:6px 0;display:block;text-decoration:none;color:inherit}
.b{max-width:75%;padding:7px 11px;border-radius:12px;margin:6px 0;background:#fff;white-space:pre-wrap}
.s{margin-left:auto;background:#d9f7e3}.y{text-align:center;color:#888;font-size:12px}.m{color:#888;font-size:12px}</style>
<header>Mock LINE OA Manager · ${esc(title)}</header><main>${body}</main></html>`;
  app.get("/", (c) => {
    const rows = seed.bots
      .map((b) => {
        const chats = seed.chats.get(b.botId) ?? [];
        const items = chats
          .map(
            (ch) =>
              `<a class="row" href="/${b.botId}/chat/${ch.chatId}">${ch.read ? "" : "● "}<b>${esc(ch.profile.name)}</b>
<div class="m">${esc(String(ch.latestEvent?.message?.text ?? `[${ch.latestEvent?.message?.type ?? ch.latestEvent?.type ?? "-"}]`))}</div></a>`,
          )
          .join("");
        return `<h3>${esc(b.name)}</h3>${items || '<p class="m">no chats</p>'}`;
      })
      .join("");
    return c.html(page("chats", rows));
  });
  app.get("/:botId/chat/:chatId", (c) => {
    const chat = seed.chats.get(c.req.param("botId"))?.find((x) => x.chatId === c.req.param("chatId"));
    const events = seed.events.get(c.req.param("chatId"));
    if (!chat || !events) return c.text("chat not found", 404);
    const bubbles = [...events]
      .reverse()
      .map((e) => {
        const when = new Date(e.timestamp).toLocaleString("th-TH");
        const m = e.message;
        if (!m) return `<div class="y">${esc(e.type)} · ${when}</div>`;
        const text = m.type === "text" ? String(m.text ?? "") : `[${m.type}] ${String(m.fileName ?? "")}`;
        return `<div class="b ${e.type === "messageSent" ? "s" : ""}">${esc(text)}<div class="m">${when}</div></div>`;
      })
      .join("");
    return c.html(
      page(
        chat.profile.name,
        `<p><a href="/">← all chats</a></p><div style="display:flex;flex-direction:column">${bubbles}</div>`,
      ),
    );
  });

  // --- every /api route needs a session, like the real console ---
  app.use("/api/*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !sessions.has(token)) return c.json({ code: "not_login" }, 401);
    await next();
  });

  // --- attachment bytes, like chat-content.line.biz/bot/{botId}/{contentHash}; needs the session too ---
  app.get("/content/bot/:botId/:hash", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !sessions.has(token)) return c.json({ code: "not_login" }, 401);
    const { body, type } = await fakeContent(c.req.param("hash"));
    return new Response(body, { status: 200, headers: { "Content-Type": type } });
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

  app.get("/api/v1/bots/:botId/chats/:chatId/notes", (c) => {
    const list = seed.notes.get(c.req.param("chatId")) ?? [];
    return c.json({ list, total: list.length });
  });
  app.get("/api/v1/bots/:botId/tags", (c) => c.json({ list: seed.tags }));
  app.get("/api/v1/bots/:botId/owners", (c) => c.json({ list: seed.owners }));

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
