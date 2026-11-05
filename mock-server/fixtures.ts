import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** One captured (fake) chat.line.biz response, as written by test/research/tools/gen_line_api_shapes.py. */
interface Fixture<T> {
  _meta: { endpoint: string };
  response: { status: number; body: T };
}

// Loose shapes: the mock passes LINE's JSON through untouched, so only the fields it reads are typed.
export interface RawEvent {
  type: string;
  timestamp: number;
  source?: { chatId?: string; userId?: string };
  message?: { id: string; type: string; text?: string; [k: string]: unknown };
  [k: string]: unknown;
}
export interface RawChat {
  chatId: string;
  read: boolean;
  done: boolean;
  lastTalkedAt?: number;
  profile: { name: string; userId?: string; groupId?: string; [k: string]: unknown };
  latestEvent?: RawEvent;
  [k: string]: unknown;
}
export interface RawBot {
  botId: string;
  name: string;
  basicSearchId?: string;
  [k: string]: unknown;
}

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FIXTURES_DIR = join(HERE, "..", "test", "research", "line-api-shapes");

function load<T>(dir: string, name: string): T {
  const raw = JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as Fixture<T>;
  return raw.response.body;
}

export interface Seed {
  me: Record<string, unknown>;
  bots: RawBot[];
  /** Chats per bot id, newest first. */
  chats: Map<string, RawChat[]>;
  /** Full history per chat id, newest first (the order chat.line.biz returns). */
  events: Map<string, RawEvent[]>;
}

/** Builds the mock's in-memory state from the research fixtures. */
export function loadSeed(dir = DEFAULT_FIXTURES_DIR): Seed {
  const me = load<Record<string, unknown>>(dir, "me");
  const bots = load<{ list: RawBot[] }>(dir, "bots").list;
  const chatList = load<{ list: RawChat[] }>(dir, "chats").list;
  const page1 = load<{ list: RawEvent[] }>(dir, "messages").list;
  const page2 = load<{ list: RawEvent[] }>(dir, "messages.older-page").list;
  const detail = load<RawChat>(dir, "chat");

  // The fixtures describe one OA. Every chat goes to the first bot; the second bot stays empty.
  const firstBot = bots[0];
  if (!firstBot) throw new Error("bots fixture is empty");
  const chats = new Map<string, RawChat[]>(bots.map((b) => [b.botId, []]));
  const all = [detail, ...chatList.filter((c) => c.chatId !== detail.chatId)];
  all.sort((a, b) => (b.lastTalkedAt ?? 0) - (a.lastTalkedAt ?? 0));
  chats.set(firstBot.botId, all);

  const events = new Map<string, RawEvent[]>();
  events.set(detail.chatId, [...page1, ...page2]);
  for (const c of all) {
    if (!events.has(c.chatId)) events.set(c.chatId, c.latestEvent ? [c.latestEvent] : []);
  }
  return { me, bots, chats, events };
}
