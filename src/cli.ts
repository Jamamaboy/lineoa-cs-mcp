#!/usr/bin/env node
/**
 * `lineoa`: the same features as the MCP tools, for a person at a terminal. Also does login and setup.
 *   lineoa login [--browser chrome|edge|brave|chromium|firefox|webkit]
 *   lineoa status | chats [--needs-reply|--unread|--all] | read <chatId> | search <text>   [--oa <name>]
 */
import "./quiet.js";
import { parseArgs } from "node:util";
import { BROWSERS, type BrowserName } from "./auth/browsers.js";
import { login } from "./auth/login.js";
import { setup } from "./cli/setup.js";
import { cut, ui, when } from "./cli/ui.js";
import { chooseOa } from "./client/choose-oa.js";
import { createLineClient } from "./client/line-client.js";
import { loadConfig } from "./config.js";
import { LineOAError } from "./domain/errors.js";
import { MessageStore } from "./index/store.js";
import { syncRecent } from "./index/sync.js";
import { chatFilters } from "./tools/list-chats.js";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    browser: { type: "string" },
    oa: { type: "string" },
    "needs-reply": { type: "boolean" },
    unread: { type: "boolean" },
    all: { type: "boolean" },
    "dry-run": { type: "boolean" },
    "allow-send": { type: "boolean" },
  },
});
const [cmd = "help", ...rest] = positionals;
const config = loadConfig();
const client = createLineClient(config);

async function pickOa() {
  return chooseOa(await client.bots(), opt.oa, config.defaultOa);
}

const commands: Record<string, () => Promise<void>> = {
  async setup() {
    ui.title("Set up lineoa-cs for your AI apps");
    for (const s of setup({ dryRun: Boolean(opt["dry-run"]), allowSend: Boolean(opt["allow-send"]) })) {
      (s.done ? ui.ok : ui.warn)(`${ui.bold(s.target)}: ${s.detail}`);
    }
    ui.line(
      `  sending: ${opt["allow-send"] ? ui.bold("ON") : "off (read-only). Run `lineoa setup --allow-send` to turn it on."}`,
    );
    ui.line(
      `\nNext: ${ui.cyan("npm run login")}, then ask your AI app: "Which LINE chats are waiting for a reply?"`,
    );
  },

  async login() {
    if (opt.browser && !BROWSERS.includes(opt.browser as BrowserName))
      throw new Error(`--browser must be one of: ${BROWSERS.join(", ")}`);
    ui.title("Log in to LINE OA Manager");
    ui.line("A browser window opens. Log in there yourself; this waits up to 5 minutes.");
    const r = await login({
      console: config.baseUrl,
      ...(opt.browser ? { browser: opt.browser as BrowserName } : {}),
    });
    ui.ok(`Logged in as ${ui.bold(r.staffName)} (${r.browser})`);
    for (const oa of r.oas) ui.line(`  ${ui.cyan("●")} ${oa.name}`);
    ui.ok(`Session saved to ${ui.dim(r.sessionFile)} (only you can read it)`);
  },

  async status() {
    const [me, bots] = await Promise.all([client.me(), client.bots()]);
    ui.title("Status");
    ui.ok(`Logged in as ${ui.bold(me.staffName)} on ${new URL(config.baseUrl).host}`);
    for (const b of bots) ui.line(`  ${ui.cyan("●")} ${b.name} ${ui.dim(b.role ?? "")}`);
    ui.line(`  sending: ${config.allowSend ? ui.bold("ON") : "off (read-only)"}`);
  },

  async chats() {
    const bot = await pickOa();
    const page = await client.listChats(bot.botId, { limit: 50 });
    const filter = opt.all ? "all" : opt.unread ? "unread" : opt["needs-reply"] ? "needs_reply" : "ongoing";
    const keep = page.items.filter(chatFilters[filter]); // same rules as the list_chats tool
    ui.title(`${bot.name} · ${keep.length} chats`);
    for (const c of keep) {
      const mark = c.unread ? ui.cyan("●") : " ";
      const who = c.lastMessage?.from === "customer" ? "←" : "→";
      ui.line(
        `${mark} ${ui.bold(cut(c.name, 22).padEnd(22))} ${ui.dim(when(c.lastMessage?.at).padEnd(14))} ${who} ${cut(c.lastMessage?.preview ?? "", 50)}`,
      );
    }
    ui.line(ui.dim("\n● unread · ← customer spoke last · → staff spoke last"));
  },

  async read() {
    const chatId = rest[0];
    if (!chatId) throw new Error("Usage: lineoa read <chatId>   (ids come from `lineoa chats`)");
    const bot = await pickOa();
    const [chat, page] = await Promise.all([
      client.getChat(bot.botId, chatId),
      client.listMessages(bot.botId, chatId, { limit: 30 }),
    ]);
    ui.title(chat.name);
    for (const m of page.items.reverse()) {
      if (m.from === "system") continue;
      const file = m.attachment ? ui.cyan(` 📎 ${m.attachment.fileName ?? m.attachment.kind}`) : "";
      const side = m.from === "customer" ? ui.bold("customer") : ui.dim("staff   ");
      ui.line(`${ui.dim(when(m.sentAt).padEnd(14))} ${side}  ${m.text ?? ""}${file}`);
    }
    ui.line(ui.dim(`\nopen in LINE OA Manager: ${chat.webUrl}`));
  },

  async search() {
    const text = rest.join(" ");
    if (!text) throw new Error("Usage: lineoa search <text>");
    const bot = await pickOa();
    const store = new MessageStore(config.indexFile);
    const sync = await syncRecent(client, store, bot.botId, config.syncLimits);
    const hits = store.search({ botId: bot.botId, text, limit: 30 });
    ui.title(`"${text}" · ${hits.length} hits ${ui.dim(`(checked ${sync.chatsChecked} chats)`)}`);
    for (const h of hits)
      ui.line(
        `${ui.bold(cut(h.chatName, 20).padEnd(20))} ${ui.dim(when(h.sentAt).padEnd(14))} ${cut(h.text, 70)}`,
      );
  },

  async help() {
    ui.title("lineoa — LINE OA Manager from the terminal");
    for (const [c, d] of [
      ["setup [--allow-send] [--dry-run]", "add this server to Claude Desktop and Claude Code"],
      ["login [--browser chrome|edge|brave|chromium|firefox|webkit]", "log in once (a browser window opens)"],
      ["status", "who is logged in, which OAs, is sending on"],
      ["chats [--needs-reply|--unread|--all] [--oa NAME]", "list chats"],
      ["read <chatId>", "show one chat"],
      ["search <text>", "find messages in recent chats"],
    ])
      ui.line(`  ${ui.cyan(`lineoa ${c}`)}\n      ${d}`);
  },
};

try {
  const run = commands[cmd];
  if (!run) throw new Error(`Unknown command "${cmd}". Run \`lineoa help\`.`);
  await run();
} catch (err) {
  const code = err instanceof LineOAError ? err.code : "";
  const msg = (err as Error).message;
  ui.fail(
    code === "AUTH_EXPIRED"
      ? "Not logged in. Run: lineoa login"
      : code === "CHOOSE_OA"
        ? `${msg.split(" Ask the person")[0]} Pick one with --oa "<name>".`
        : msg,
  );
  process.exitCode = 1;
}
