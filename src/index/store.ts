import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Message } from "../domain/types.js";

export interface StoredHit {
  botId: string;
  chatId: string;
  chatName: string;
  id: string;
  sentAt: string;
  from: string;
  text: string;
}

/**
 * A local copy of chat text, because chat.line.biz has no message-search endpoint (PLAN A4).
 * Search is a substring match, which works for Thai (no spaces between words). Node's built-in
 * SQLite is used so the install needs no native modules.
 */
export class MessageStore {
  private db: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    // Loaded on first use (not at import time), so src/quiet.ts can hide its ExperimentalWarning.
    const { DatabaseSync: Db } = createRequire(import.meta.url)(
      "node:sqlite",
    ) as typeof import("node:sqlite");
    this.db = new Db(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        bot_id TEXT NOT NULL, chat_id TEXT NOT NULL, id TEXT NOT NULL,
        sent_at TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL,
        PRIMARY KEY (bot_id, id));
      CREATE INDEX IF NOT EXISTS messages_chat ON messages (bot_id, chat_id, sent_at);
      CREATE TABLE IF NOT EXISTS chats (
        bot_id TEXT NOT NULL, chat_id TEXT NOT NULL, name TEXT NOT NULL, synced_upto TEXT,
        PRIMARY KEY (bot_id, chat_id));`);
  }

  /** When this chat's newest stored activity was, so sync can skip chats with nothing new. */
  syncedUpto(botId: string, chatId: string): string | undefined {
    const row = this.db
      .prepare("SELECT synced_upto FROM chats WHERE bot_id = ? AND chat_id = ?")
      .get(botId, chatId) as { synced_upto: string | null } | undefined;
    return row?.synced_upto ?? undefined;
  }

  saveChat(botId: string, chatId: string, name: string, messages: Message[], upto: string): void {
    const put = this.db.prepare(
      "INSERT OR REPLACE INTO messages (bot_id, chat_id, id, sent_at, sender, text) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const m of messages) {
      if (m.text) put.run(botId, chatId, m.id, m.sentAt, m.from, m.text);
    }
    this.db
      .prepare("INSERT OR REPLACE INTO chats (bot_id, chat_id, name, synced_upto) VALUES (?, ?, ?, ?)")
      .run(botId, chatId, name, upto);
  }

  search(q: {
    botId: string;
    text: string;
    chatId?: string;
    from?: string;
    since?: string;
    until?: string;
    limit: number;
  }): StoredHit[] {
    const where = ["m.bot_id = ?", "m.text LIKE ? ESCAPE '\\'"];
    const like = `%${q.text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    const args: string[] = [q.botId, like];
    const filters: [string, string | undefined][] = [
      ["m.chat_id = ?", q.chatId],
      ["m.sender = ?", q.from],
      ["m.sent_at >= ?", q.since],
      ["m.sent_at < ?", q.until], // exclusive: the caller passes the moment just after the last day
    ];
    for (const [clause, value] of filters) {
      if (value === undefined) continue;
      where.push(clause);
      args.push(value);
    }
    return this.db
      .prepare(
        `SELECT m.bot_id AS botId, m.chat_id AS chatId, c.name AS chatName, m.id, m.sent_at AS sentAt,
                m.sender AS "from", m.text
         FROM messages m JOIN chats c ON c.bot_id = m.bot_id AND c.chat_id = m.chat_id
         WHERE ${where.join(" AND ")} ORDER BY m.sent_at DESC LIMIT ${Math.min(q.limit, 50)}`,
      )
      .all(...args) as unknown as StoredHit[];
  }

  /** The messages right before and after a hit, for context. */
  around(botId: string, chatId: string, sentAt: string): { before?: string; after?: string } {
    const one = (sql: string) =>
      (this.db.prepare(sql).get(botId, chatId, sentAt) as { text: string } | undefined)?.text;
    const before = one(
      "SELECT text FROM messages WHERE bot_id = ? AND chat_id = ? AND sent_at < ? ORDER BY sent_at DESC LIMIT 1",
    );
    const after = one(
      "SELECT text FROM messages WHERE bot_id = ? AND chat_id = ? AND sent_at > ? ORDER BY sent_at ASC LIMIT 1",
    );
    return { ...(before ? { before } : {}), ...(after ? { after } : {}) };
  }
}
