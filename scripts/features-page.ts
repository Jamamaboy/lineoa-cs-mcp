/**
 * `npm run features`: writes docs/features.html (what lineoa-cs can do, plus every feature branch and the
 * small commits inside it, read from git) and opens it. `--no-open` only writes the file.
 * Each merge on dev's first-parent line is one feature (or one plan/research round or release).
 */
import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = "https://github.com/Jamamaboy/lineoa-cs-mcp";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Early plan notes used a placeholder company name; the page describes capabilities only.
const tidy = (s: string) => s.replace(/Acme Support/g, "the support OA");

const ref = ["dev", "origin/dev", "HEAD"].find((r) => {
  try {
    git("rev-parse", "--verify", "--quiet", r);
    return true;
  } catch {
    return false;
  }
}) as string;

type Feature = { sha: string; date: string; name: string; kind: string; commits: string[][] };
const features: Feature[] = git(
  "log",
  "--first-parent",
  "--merges",
  "--reverse",
  "--format=%h|%ad|%s",
  "--date=short",
  ref,
)
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [sha = "", date = "", subject = ""] = line.split("|");
    const name = tidy(subject.replace(/^merge: /, "").replace(/ into dev.*$/, ""));
    const kind = name.startsWith("feat/")
      ? "feature"
      : name.startsWith("release/")
        ? "release"
        : (name.split(/[ /]/)[0] ?? "");
    const commits = git("log", "--reverse", "--no-merges", "--format=%h|%s", `${sha}^1..${sha}^2`)
      .split("\n")
      .filter(Boolean)
      .map((c) => c.split("|"));
    return { sha, date, name, kind, commits };
  });

const tools = [
  ["auth_status", "Who is logged in, which OAs they can reach, whether sending is on."],
  ["list_chats", "Chats that are ongoing, unread or waiting for a reply, with a link to open each one."],
  ["read_chat", "One chat's messages, newest first, with images and files marked."],
  ["get_user_profile", "The customer's name, tags, notes and the staff member assigned."],
  ["search_messages", "Find words in recent chats (Thai, English, Chinese) with dates."],
  ["get_attachment", "Download an image or file; images come back small enough for the AI to look at."],
  [
    "send_message",
    "Reply as the staff member. Off unless LINEOA_ALLOW_SEND=true; the AI asks the human first.",
  ],
];

const card = (f: Feature) => `
  <details class="card ${f.kind}"${f.kind === "feature" ? " open" : ""}>
    <summary><span class="tag">${esc(f.kind)}</span><b>${esc(f.name)}</b>
      <span class="meta">${f.date} · ${f.commits.length} commit${f.commits.length === 1 ? "" : "s"} ·
      <a href="${REPO}/commit/${f.sha}">${f.sha}</a></span></summary>
    <ol>${f.commits.map(([h = "", s = ""]) => `<li><a href="${REPO}/commit/${h}"><code>${h}</code></a> ${esc(tidy(s))}</li>`).join("")}</ol>
  </details>`;

const count = (k: string) => features.filter((f) => f.kind === k).length;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>lineoa-cs features</title>
<style>
:root{--bg:#fff;--fg:#1f2328;--mute:#57606a;--line:#d0d7de;--card:#f6f8fa;--purple:#6f4ef2;--green:#06c755;--dark:#24292f}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--mute:#9198a1;--line:#30363d;--card:#161b22}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif}
main{max-width:920px;margin:0 auto;padding:32px 16px 64px}h1{margin:0 0 4px}h2{margin-top:40px}
.lead{color:var(--mute)}a{color:var(--purple)}code{font-size:13px}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.tool{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card)}
.tool b{font-family:SFMono-Regular,Menlo,monospace;font-size:14px;color:var(--purple)}
.card{border:1px solid var(--line);border-radius:12px;margin:10px 0;background:var(--card)}
.card summary{cursor:pointer;padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.card ol{margin:0;padding:0 18px 12px 46px}.card li{margin:3px 0}
.meta{color:var(--mute);font-size:13px;margin-left:auto}
.tag{font-size:12px;font-weight:700;color:#fff;background:var(--dark);border-radius:6px;padding:1px 8px}
.feature .tag{background:var(--purple)}.release .tag{background:var(--green)}
.shot{margin:14px 0 22px}.shot img{width:100%;border:1px solid var(--line);border-radius:12px;background:#fff}
.shot figcaption{color:var(--mute);font-size:13px;margin-top:6px}
.chat{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:14px 16px}
.me,.ai{margin:8px 0;padding:10px 12px;border-radius:12px;max-width:85%}.me{background:var(--purple);color:#fff;margin-left:auto}
.ai{background:var(--bg);border:1px solid var(--line)}.call{font:12px SFMono-Regular,Menlo,monospace;color:var(--mute)}
</style></head><body><main>
<h1>lineoa-cs</h1>
<p class="lead">An MCP server that lets an AI app work LINE OA Manager chats the way a support person does:
read, search, look at customers and files, and reply only after a human says OK.</p>

<h2>What it can do</h2>
<div class="tools">${tools.map(([n, d]) => `<div class="tool"><b>${n}</b><br>${d}</div>`).join("")}</div>
<p>Ask in plain words, for example: <i>"Which LINE chats are waiting for a reply?"</i>,
<i>"Summarise the chat with … in English"</i>, <i>"Search for 'receipt' this week"</i>.
No LINE account? The <code>lineoa-cs-mock</code> server answers the same questions with sample chats.</p>


<h2>See it</h2>
<div class="chat">
  <div class="me">Which LINE chats are waiting for a reply?</div>
  <div class="ai"><div class="call">→ list_chats(oa: "Demo Shop", filter: "needs_reply")</div>
    2 chats are waiting in <b>Demo Shop</b>:<br>• <b>นก 🌸</b>: asks for a refund on order #1250, items missing · <a href="#">open in LINE</a><br>
    • <b>ทีมตัวแทนขาย</b> (group): asks for yesterday's sales · <a href="#">open in LINE</a></div>
  <div class="me">Draft a reply to นก</div>
  <div class="ai"><div class="call">→ read_chat · get_user_profile</div>Draft (not sent): "ขอโทษค่ะ เดี๋ยวตรวจสอบออเดอร์ #1250 และดำเนินการคืนเงินให้นะคะ"<br>
    Say <b>OK</b> and I will send it with <code>send_message</code>.</div>
</div>
<p class="lead">An example with the built-in mock's sample chats. On a live OA sending is off unless you turn it on.</p>
<figure class="shot"><img src="assets/demo-cli.gif" alt="the terminal command against the mock"><figcaption>The terminal command (<code>npm run lineoa</code>) on the mock.</figcaption></figure>
<figure class="shot"><img src="assets/flow.svg" alt="flow"><figcaption>How a support chat flows, left to right.</figcaption></figure>
<figure class="shot"><img src="assets/sequence.svg" alt="step by step"><figcaption>Step by step: set up, read and draft, send after OK.</figcaption></figure>
<figure class="shot"><img src="assets/architecture.svg" alt="architecture"><figcaption>How it is built.</figcaption></figure>
<figure class="shot"><img src="assets/supports.svg" alt="what it works with"><figcaption>What it works with, and what was tested.</figcaption></figure>

<h2>How it was built</h2>
<p class="lead">${count("feature")} feature branches, ${count("release")} releases, and the plan and research
rounds, each merged with <code>--no-ff</code>. Open one to see its small commits, oldest first.
Generated from <code>git log --first-parent ${ref}</code>.</p>
${features.map(card).join("")}
</main></body></html>
`;

writeFileSync("docs/features.html", html);
console.log(
  `docs/features.html: ${features.length} merges, ${features.reduce((n, f) => n + f.commits.length, 0)} commits`,
);
if (!process.argv.includes("--no-open")) {
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(opener, ["docs/features.html"], { stdio: "ignore", detached: true }).unref();
}
