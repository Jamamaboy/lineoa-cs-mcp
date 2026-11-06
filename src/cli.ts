#!/usr/bin/env node
/**
 * `lineoa`: the same features as the MCP tools, for a person at a terminal. Also does login and setup.
 *   lineoa login [--browser chrome|edge|brave|chromium|firefox|webkit]
 *   lineoa status | chats [--needs-reply|--unread|--all] | read <chatId|name> | search <text>   [--oa <name>]
 */
import "./quiet.js";
import { parseArgs } from "node:util";
import { BROWSERS, type BrowserName } from "./auth/browsers.js";
import { login } from "./auth/login.js";
import { setup } from "./cli/setup.js";
import { cut, matchChats, ui, when } from "./cli/ui.js";
import { chooseOa } from "./client/choose-oa.js";
import { createLineClient, type LineOAClient, SAFE_ID } from "./client/line-client.js";
import { type Config, loadConfig } from "./config.js";
import { LineOAError } from "./domain/errors.js";
import { MessageStore } from "./index/store.js";
import { syncRecent } from "./index/sync.js";
import { withMockIfAsked } from "./mock-env.js";
import { chatFilters } from "./tools/list-chats.js";

const parseCli = () =>
  parseArgs({
    allowPositionals: true,
    options: {
      browser: { type: "string" },
      oa: { type: "string" },
      "needs-reply": { type: "boolean" },
      unread: { type: "boolean" },
      all: { type: "boolean" },
      "dry-run": { type: "boolean" },
      "allow-send": { type: "boolean" },
      mock: { type: "boolean" },
    },
  });

type Ctx = {
  opt: ReturnType<typeof parseCli>["values"];
  rest: string[];
  client: LineOAClient;
  config: Config;
};

function makeCommands({ opt, rest, client, config }: Ctx): Record<string, () => Promise<void>> {
  async function pickOa() {
    return chooseOa(await client.bots(), opt.oa, config.defaultOa);
  }

  return {
    async setup() {
      ui.title("Set up lineoa-cs for your AI apps");
      const mockOnly = Boolean(opt.mock);
      const steps = setup({
        dryRun: Boolean(opt["dry-run"]),
        allowSend: Boolean(opt["allow-send"]),
        mock: mockOnly,
      });
      for (const s of steps) (s.done ? ui.ok : ui.warn)(`${ui.bold(s.target)}: ${s.detail}`);
      if (mockOnly) {
        // The mock never reaches LINE, so it needs no login and may send (to fake chats only).
        ui.line("  added lineoa-cs-mock: sample chats, sending on, never reaches LINE.");
        ui.line('\nNext: restart your AI app and ask: "Which LINE chats are waiting for a reply?"');
        return;
      }
      ui.line(
        `  sending: ${opt["allow-send"] ? ui.bold("ON") : "off (read-only). Run `npm run setup -- --allow-send` to turn it on."}`,
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
          `${mark} ${ui.bold(cut(c.name, 22).padEnd(22))} ${ui.dim((c.lastMessage ? when(c.lastMessage.at) : "-").padEnd(18))} ${c.lastMessage ? `${who} ${cut(c.lastMessage.preview ?? "", 50)}` : ui.dim("(no messages yet)")}`,
        );
      }
      ui.line(ui.dim("\n● unread · ← customer spoke last · → staff spoke last"));
    },

    async read() {
      const arg = rest[0]?.trim();
      if (!arg)
        throw new Error(
          "Usage: npm run lineoa -- read <chatId|name>   (ids come from `npm run lineoa -- chats`)",
        );
      const bot = await pickOa();
      let chat: Awaited<ReturnType<typeof client.getChat>> | undefined;
      // An id-shaped argument may still be a name (e.g. "Mint"), so NOT_FOUND falls through to the name search.
      if (SAFE_ID.test(arg)) {
        try {
          chat = await client.getChat(bot.botId, arg);
        } catch (err) {
          if (!(err instanceof LineOAError && err.code === "NOT_FOUND")) throw err;
        }
      }
      if (!chat) {
        const { items } = await client.listChats(bot.botId, { limit: 125 });
        const { exact, partial } = matchChats(items, arg);
        if (exact.length > 1) {
          ui.warn(`${exact.length} chats are named "${arg}". Run read with the id of the one you want:`);
          for (const c of exact) ui.line(`  ${c.name}  ${c.chatId}`);
          process.exitCode = 1;
          return;
        }
        if (!exact[0]) {
          if (partial.length === 0)
            throw new Error(
              `No chat named "${arg}" in the latest 125 chats. List them with: npm run lineoa -- chats`,
            );
          // Never open a partial match: reading the wrong customer's chat is worse than asking again.
          for (const c of partial.slice(0, 10)) ui.line(`Did you mean ${c.name} (${c.chatId})?`);
          throw new Error("No exact match. Run read again with the id of the chat you mean.");
        }
        ui.line(`→ ${exact[0].name} (${exact[0].chatId})`);
        chat = await client.getChat(bot.botId, exact[0].chatId);
      }
      const page = await client.listMessages(bot.botId, chat.chatId, { limit: 30 });
      ui.title(chat.name);
      for (const m of page.items.reverse()) {
        if (m.from === "system") continue;
        const file = m.attachment ? ui.cyan(` 📎 ${m.attachment.fileName ?? m.attachment.kind}`) : "";
        const side = m.from === "customer" ? ui.bold("customer") : ui.dim("staff   ");
        ui.line(`${ui.dim(when(m.sentAt).padEnd(18))} ${side}  ${m.text ?? ""}${file}`);
      }
      ui.line(ui.dim(`\nopen in LINE OA Manager: ${chat.webUrl}`));
    },

    async search() {
      const text = rest.join(" ");
      if (!text) throw new Error("Usage: npm run lineoa -- search <text>");
      const bot = await pickOa();
      const store = new MessageStore(config.indexFile);
      const sync = await syncRecent(client, store, bot.botId, config.syncLimits);
      const hits = store.search({ botId: bot.botId, text, limit: 30 });
      ui.title(`"${text}" · ${hits.length} hits ${ui.dim(`(checked ${sync.chatsChecked} chats)`)}`);
      for (const h of hits)
        ui.line(
          `${ui.bold(cut(h.chatName, 20).padEnd(20))} ${ui.dim(when(h.sentAt).padEnd(18))} ${cut(h.text, 70)}`,
        );
    },

    async help() {
      ui.title("lineoa — LINE OA Manager from the terminal");
      for (const [c, d] of [
        [
          "setup [--allow-send] [--mock] [--dry-run]",
          "add this server (or, with --mock, the sample-data server) to Claude Desktop and Claude Code",
        ],
        [
          "login [--browser chrome|edge|brave|chromium|firefox|webkit]",
          "log in once (a browser window opens)",
        ],
        ["status", "who is logged in, which OAs, is sending on"],
        ["chats [--needs-reply|--unread|--all] [--oa NAME]", "list chats"],
        ["read <chatId|name>", "show one chat (a name must match exactly)"],
        ["search <text>", "find messages in recent chats"],
      ])
        ui.line(`  ${ui.cyan(`npm run lineoa -- ${c}`)}\n      ${d}`);
    },
  };
}

// Everything runs inside this try, so a bad flag or bad config is one friendly line, never a stack.
let mock: { close: () => Promise<void> } = { close: async () => {} };
try {
  const { values: opt, positionals } = parseCli();
  const [cmd = "help", ...rest] = positionals;
  // LINEOA_MOCK=1 runs the commands against the built-in mock, like the MCP server.
  const started = await withMockIfAsked({ ...process.env });
  mock = started;
  const config = loadConfig(started.env);
  const client = createLineClient(config);
  const run = makeCommands({ opt, rest, client, config })[cmd];
  if (!run) throw new Error(`Unknown command "${cmd}". Run \`npm run lineoa -- help\`.`);
  await run();
} catch (err) {
  const code = err instanceof LineOAError ? err.code : "";
  const msg = err instanceof Error ? err.message : String(err);
  const argCode = (err as { code?: unknown }).code;
  ui.fail(
    code === "AUTH_EXPIRED"
      ? "Not logged in. Run: npm run login"
      : code === "CHOOSE_OA"
        ? `${msg.split(" Ask the person")[0]} Pick one with --oa "<name>".`
        : typeof argCode === "string" && argCode.startsWith("ERR_PARSE_ARGS_")
          ? `${(msg.split(". ")[0] ?? msg).replace(/\.$/, "")}. Run \`npm run lineoa -- help\`.`
          : msg,
  );
  process.exitCode = 1;
} finally {
  await mock.close();
}
