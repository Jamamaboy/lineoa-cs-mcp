/**
 * `npm run login`: the CS person logs in to LINE OA Manager in a real Chrome window, by themselves
 * (email, QR, 2FA, captcha). We never see or store the password. Once chat.line.biz answers
 * /api/v1/me, only the *.line.biz cookies are saved to the session file.
 */
import { chromium } from "playwright-core";
import { sessionPath, writeSession } from "./session-file.js";

const CONSOLE = process.env.LINEOA_BASE_URL ?? "https://chat.line.biz";
const TIMEOUT_MS = 5 * 60_000;

const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(CONSOLE);
console.log("A Chrome window is open. Log in to LINE OA Manager there (this window waits up to 5 minutes).");

// Poll the same endpoint the server uses; the browser's own cookies make the request.
type Me = { name?: string };
type Bots = { list?: { botId: string; name: string }[] };
let me: Me | undefined;
const deadline = Date.now() + TIMEOUT_MS;
while (!me && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await context.request
    .get(`${CONSOLE}/api/v1/me`, { failOnStatusCode: false })
    .catch(() => undefined);
  if (res?.ok() && (res.headers()["content-type"] ?? "").includes("json")) me = (await res.json()) as Me;
}
if (!me) {
  console.error("Login not finished in 5 minutes. Run `npm run login` again.");
  await browser.close();
  process.exit(1);
}

const bots = (await (
  await context.request.get(`${CONSOLE}/api/v1/bots?noFilter=true&limit=1000`)
).json()) as Bots;
const state = await context.storageState();
const lineOnly = {
  cookies: state.cookies.filter((c) => c.domain.replace(/^\./, "").endsWith("line.biz")),
  origins: [],
};
const path = sessionPath();
writeSession(path, lineOnly);
await browser.close();

console.log(`\n✓ Logged in as ${me.name ?? "(unknown)"}`);
for (const b of bots.list ?? []) console.log(`  OA: ${b.name}  (${b.botId})`);
console.log(`✓ Session saved to ${path} (only you can read it). Never commit this file.`);
