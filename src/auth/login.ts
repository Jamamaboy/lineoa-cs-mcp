/**
 * Login: the CS person logs in to LINE OA Manager in a real browser window, by themselves (email,
 * QR, 2FA, captcha). We never see or store the password. Once chat.line.biz answers /api/v1/me,
 * only the *.line.biz cookies are saved to the session file.
 */
import { type BrowserName, openBrowser } from "./browsers.js";
import { sessionPath, writeSession } from "./session-file.js";
import { hostMatches } from "./session-source.js";

export interface LoginResult {
  staffName: string;
  oas: { botId: string; name: string }[];
  sessionFile: string;
  browser: BrowserName;
}

export async function login(opts: { console?: string; browser?: BrowserName; timeoutMs?: number } = {}) {
  const base = opts.console ?? "https://chat.line.biz";
  const { browser, name } = await openBrowser(opts.browser);
  try {
    const context = await browser.newContext();
    await (await context.newPage()).goto(base);

    // Poll the same endpoint the server uses; the browser's own cookies make the request.
    let me: { name?: string } | undefined;
    const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
    while (!me && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await context.request
        .get(`${base}/api/v1/me`, { failOnStatusCode: false })
        .catch(() => undefined);
      if (res?.ok() && (res.headers()["content-type"] ?? "").includes("json")) me = await res.json();
    }
    if (!me) throw new Error("Login was not finished in time. Run the login again.");

    const bots = (await (
      await context.request.get(`${base}/api/v1/bots?noFilter=true&limit=1000`)
    ).json()) as {
      list?: { botId: string; name: string }[];
    };
    const state = await context.storageState();
    const cookies = state.cookies.filter((c) => hostMatches(c.domain.replace(/^\./, ""), "line.biz"));
    const sessionFile = sessionPath();
    writeSession(sessionFile, { cookies, origins: [] });
    return {
      staffName: me.name ?? "(unknown)",
      oas: (bots.list ?? []).map((b) => ({ botId: b.botId, name: b.name })),
      sessionFile,
      browser: name,
    } satisfies LoginResult;
  } finally {
    await browser.close();
  }
}
