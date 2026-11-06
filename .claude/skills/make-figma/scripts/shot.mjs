// Full-page screenshots of local HTML mockups via Chrome DevTools Protocol (no npm deps).
// usage: node shot.mjs jobs.json outDir
// job: { file, out, width?, steps?: [js string, ...], hideFixed? }
//   tall pages are split into <=3800px parts: out__p1.png, out__p2.png ...
//   hideFixed defaults to true: before steps run, every element computed as
//   position:fixed/sticky is force-hidden, so nav bars / cookie banners / modals
//   pinned to the viewport don't get duplicated or smeared across split parts.
//   Set hideFixed: false on a job that specifically wants to capture an overlay.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HIDE_FIXED_JS = "document.querySelectorAll('*').forEach(el=>{const cs=getComputedStyle(el);if(cs.position==='fixed'||cs.position==='sticky')el.style.setProperty('visibility','hidden','important');});";

const CHROME = process.env.HOME + "/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const [jobsFile, outDir] = process.argv.slice(2);
const jobs = JSON.parse(readFileSync(jobsFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 400);
const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
if (!wsUrl) { proc.kill(); throw new Error("chrome did not start"); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map(); const events = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else if (m.method) events.push(m);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

for (const job of jobs) {
  const width = job.width || 1440;
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  events.length = 0;
  await send("Page.navigate", { url: "file://" + job.file }, sessionId);
  for (let i = 0; i < 100 && !events.some((e) => e.method === "Page.loadEventFired" && e.sessionId === sessionId); i++) await sleep(100);
  await send("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready.then(()=>1) : 1", awaitPromise: true }, sessionId);
  await sleep(600);
  if (job.hideFixed !== false) {
    const r = await send("Runtime.evaluate", { expression: HIDE_FIXED_JS }, sessionId);
    if (r.exceptionDetails) console.error("hideFixed failed", job.out, r.exceptionDetails.text);
  }
  for (const step of job.steps || []) {
    const r = await send("Runtime.evaluate", { expression: `(async()=>{${step}})()`, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) console.error("step failed", job.out, step, r.exceptionDetails.text);
    await sleep(250);
  }
  await sleep(300);
  const m = await send("Page.getLayoutMetrics", {}, sessionId);
  const H = Math.ceil(m.cssContentSize.height);
  const PART = 3800; const parts = Math.max(1, Math.ceil(H / PART));
  for (let p = 0; p < parts; p++) {
    const y = p * PART, h = Math.min(PART, H - y);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y, width, height: h, scale: 1 } }, sessionId);
    const name = parts > 1 ? `${job.out}__p${p + 1}.png` : `${job.out}.png`;
    writeFileSync(join(outDir, name), Buffer.from(data, "base64"));
  }
  console.log(job.out, width + "x" + H, parts + " part(s)");
  await send("Target.closeTarget", { targetId });
}
ws.close(); proc.kill();
